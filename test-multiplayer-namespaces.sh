#!/usr/bin/env bash
# Multiplayer testing with isolated network namespaces on one machine
# This gives each Electron instance a separate IP and subnet, simulating real devices

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_HOME="/tmp/tfgf-host"
CLIENT_HOME="/tmp/tfgf-client"

usage() {
  cat <<EOF
Usage: $0 [command] [options]

Commands:
  setup       Create network namespaces and bridge (requires sudo)
  host        Launch host instance (requires setup, run in separate terminal)
  client      Launch client instance (requires setup, run in separate terminal)
  info        Show namespace and bridge status
  cleanup     Remove namespaces and bridge (requires sudo)
  test        Full setup + launch both instances in tmux (requires tmux)
  set-delay   Configure simulated network conditions on the bridge
              (requires setup, applies tc netem rules)

set-delay options:
  --delay <ms>         One-way latency in ms (default: 5)
  --jitter <ms>        Random variation in ms (default: 1)
  --loss <percent>     Packet loss percentage (default: 0)
  --rate <rate>        Bandwidth limit e.g. 100mbit, 10mbit (optional)
  --direction <dir>    'host', 'client', or 'both' (default: both)
  --clear              Remove all traffic control rules

Examples:
  # Terminal 1: Setup namespaces
  sudo $0 setup

  # Terminal 2: Launch host
  $0 host

  # Terminal 3: Launch client
  $0 client

  # Or all-in-one with tmux:
  sudo $0 test

  # Simulate typical LAN latency (~2-5ms, 0.1% loss):
  sudo $0 set-delay --delay 3 --jitter 1 --loss 0.1

  # Simulate congested WiFi (~20ms, 2% loss, 50mbit limit):
  sudo $0 set-delay --delay 20 --jitter 5 --loss 2 --rate 50mbit

  # Clear all emulated conditions:
  sudo $0 set-delay --clear

  # Apply only to the client's incoming traffic:
  sudo $0 set-delay --delay 10 --direction client

EOF
  exit 1
}

setup_namespaces() {
  echo "[setup] Creating network namespaces and bridge..."
  
  # Clean old setup
  echo "[setup] Cleaning old namespaces..."
  sudo ip netns del ns-host 2>/dev/null || true
  sudo ip netns del ns-client 2>/dev/null || true
  sudo ip link del br0 2>/dev/null || true
  
  # Create bridge
  echo "[setup] Creating bridge br0..."
  sudo ip link add br0 type bridge
  sudo ip addr add 10.10.0.254/24 dev br0
  sudo ip link set br0 up
  
  # Host namespace
  echo "[setup] Creating ns-host (10.10.0.1)..."
  sudo ip netns add ns-host
  sudo ip link add veth-host type veth peer name veth-host-br
  sudo ip link set veth-host netns ns-host
  sudo ip link set veth-host-br master br0
  sudo ip link set veth-host-br up
  sudo ip netns exec ns-host ip addr add 10.10.0.1/24 dev veth-host
  sudo ip netns exec ns-host ip link set veth-host up
  sudo ip netns exec ns-host ip link set lo up
  sudo ip netns exec ns-host ip route add default via 10.10.0.254
  
  # Client namespace
  echo "[setup] Creating ns-client (10.10.0.2)..."
  sudo ip netns add ns-client
  sudo ip link add veth-client type veth peer name veth-client-br
  sudo ip link set veth-client netns ns-client
  sudo ip link set veth-client-br master br0
  sudo ip link set veth-client-br up
  sudo ip netns exec ns-client ip addr add 10.10.0.2/24 dev veth-client
  sudo ip netns exec ns-client ip link set veth-client up
  sudo ip netns exec ns-client ip link set lo up
  sudo ip netns exec ns-client ip route add default via 10.10.0.254
  
  echo "[setup] ✓ Namespaces ready"
  echo ""
  echo "  Host:   10.10.0.1"
  echo "  Client: 10.10.0.2"
  echo "  Bridge: 10.10.0.254"
  echo ""
  echo "Next: run '$0 host' in one terminal and '$0 client' in another"
}

cleanup_namespaces() {
  echo "[cleanup] Removing namespaces and bridge..."
  sudo ip netns del ns-host 2>/dev/null || echo "  ns-host not found (ok)"
  sudo ip netns del ns-client 2>/dev/null || echo "  ns-client not found (ok)"
  sudo ip link del br0 2>/dev/null || echo "  br0 not found (ok)"
  echo "[cleanup] ✓ Done"
}

show_info() {
  echo "[info] Network namespaces:"
  sudo ip netns list | grep -E "ns-host|ns-client" || echo "  (none)"
  echo ""
  echo "[info] Bridge br0:"
  sudo ip addr show br0 2>/dev/null || echo "  (not found)"
  echo ""
  echo "[info] Namespace IPs:"
  sudo ip netns exec ns-host ip addr show veth-host 2>/dev/null | grep "inet " || echo "  ns-host not ready"
  sudo ip netns exec ns-client ip addr show veth-client 2>/dev/null | grep "inet " || echo "  ns-client not ready"
}

# === Network condition emulation using tc netem ===

# Apply netem rules to a single bridge-side veth interface
_apply_netem() {
  local iface="$1"
  local delay="$2"
  local jitter="$3"
  local loss="$4"
  local rate="$5"

  # Clear existing qdisc on this interface
  sudo tc qdisc del dev "$iface" root 2>/dev/null || true

  # Build the netem command
  local cmd="sudo tc qdisc add dev $iface root netem"
  cmd+=" delay ${delay}ms ${jitter}ms"
  cmd+=" loss $loss%"
  if [[ -n "$rate" ]]; then
    cmd+=" rate $rate"
  fi

  echo "    Applying to $iface: delay=${delay}ms±${jitter}ms loss=${loss}% rate=${rate:-unlimited}"
  eval "$cmd"
}

set_delay() {
  local DELAY=5
  local JITTER=1
  local LOSS=0
  local RATE=""
  local DIRECTION="both"
  local CLEAR=false

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --delay) DELAY="$2"; shift 2 ;;
      --jitter) JITTER="$2"; shift 2 ;;
      --loss) LOSS="$2"; shift 2 ;;
      --rate) RATE="$2"; shift 2 ;;
      --direction) DIRECTION="$2"; shift 2 ;;
      --clear) CLEAR=true; shift ;;
      *) echo "[error] Unknown option: $1"; exit 1 ;;
    esac
  done

  # Validate direction
  if [[ "$DIRECTION" != "host" && "$DIRECTION" != "client" && "$DIRECTION" != "both" ]]; then
    echo "[error] --direction must be 'host', 'client', or 'both'"
    exit 1
  fi

  if $CLEAR; then
    echo "[netem] Clearing all traffic control rules..."
    sudo tc qdisc del dev veth-host-br root 2>/dev/null || echo "  (no rules on veth-host-br)"
    sudo tc qdisc del dev veth-client-br root 2>/dev/null || echo "  (no rules on veth-client-br)"
    echo "[netem] ✓ All rules cleared"
    exit 0
  fi

  echo "[netem] Configuring simulated network conditions..."
  echo ""
  echo "  Delay:      ${DELAY}ms"
  echo "  Jitter:     ±${JITTER}ms"
  echo "  Loss:       ${LOSS}%"
  echo "  Rate:       ${RATE:-unlimited}"
  echo "  Direction:  $DIRECTION"
  echo ""

  if [[ "$DIRECTION" == "host" || "$DIRECTION" == "both" ]]; then
    # Apply on the bridge side (traffic incoming to host namespace)
    _apply_netem "veth-host-br" "$DELAY" "$JITTER" "$LOSS" "$RATE"
  fi

  if [[ "$DIRECTION" == "client" || "$DIRECTION" == "both" ]]; then
    # Apply on the bridge side (traffic incoming to client namespace)
    _apply_netem "veth-client-br" "$DELAY" "$JITTER" "$LOSS" "$RATE"
  fi

  echo ""
  echo "[netem] ✓ Network conditions applied"
  echo "  To verify:   $0 info"
}

# Capture display/auth env before sudo strips them
_capture_display_env() {
  # X11/XWayland
  DISPLAY_VAL="${DISPLAY:-:0}"
  XAUTH_VAL="${XAUTHORITY:-$HOME/.Xauthority}"
  
  # Wayland
  WAYLAND_VAL="${WAYLAND_DISPLAY:-wayland-0}"
  XDG_RUNTIME_VAL="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  
  # D-Bus
  DBUS_VAL="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_VAL/bus}"
}

launch_host() {
  echo "[host] Launching Electron in ns-host namespace (10.10.0.1)..."
  mkdir -p "$HOST_HOME"/.config "$HOST_HOME"/.local/share
  _capture_display_env
  
  cd "$REPO_ROOT"
  sudo ip netns exec ns-host env \
    HOME="$HOST_HOME" \
    XDG_CONFIG_HOME="$HOST_HOME/.config" \
    XDG_DATA_HOME="$HOST_HOME/.local/share" \
    DISPLAY="$DISPLAY_VAL" \
    WAYLAND_DISPLAY="$WAYLAND_VAL" \
    XDG_RUNTIME_DIR="$XDG_RUNTIME_VAL" \
    XAUTHORITY="$XAUTH_VAL" \
    DBUS_SESSION_BUS_ADDRESS="$DBUS_VAL" \
    ELECTRON_DISABLE_SANDBOX="${ELECTRON_DISABLE_SANDBOX:-1}" \
    ELECTRON_OZONE_PLATFORM_HINT="${ELECTRON_OZONE_PLATFORM_HINT:-wayland}" \
    npm start
}

launch_client() {
  echo "[client] Launching Electron in ns-client namespace (10.10.0.2)..."
  mkdir -p "$CLIENT_HOME"/.config "$CLIENT_HOME"/.local/share
  _capture_display_env
  
  cd "$REPO_ROOT"
  sudo ip netns exec ns-client env \
    HOME="$CLIENT_HOME" \
    XDG_CONFIG_HOME="$CLIENT_HOME/.config" \
    XDG_DATA_HOME="$CLIENT_HOME/.local/share" \
    DISPLAY="$DISPLAY_VAL" \
    WAYLAND_DISPLAY="$WAYLAND_VAL" \
    XDG_RUNTIME_DIR="$XDG_RUNTIME_VAL" \
    XAUTHORITY="$XAUTH_VAL" \
    DBUS_SESSION_BUS_ADDRESS="$DBUS_VAL" \
    ELECTRON_DISABLE_SANDBOX="${ELECTRON_DISABLE_SANDBOX:-1}" \
    ELECTRON_OZONE_PLATFORM_HINT="${ELECTRON_OZONE_PLATFORM_HINT:-wayland}" \
    npm start
}

test_with_tmux() {
  if ! command -v tmux &> /dev/null; then
    echo "[error] tmux not found; use manual setup instead"
    exit 1
  fi
  
  setup_namespaces
  
  SESSION="tfgf-test-$$"
  echo "[test] Creating tmux session: $SESSION"
  
  tmux new-session -d -s "$SESSION" -x 240 -y 60
  tmux send-keys -t "$SESSION" "cd '$REPO_ROOT' && $0 host" Enter
  tmux split-window -t "$SESSION" -h
  tmux send-keys -t "$SESSION" "cd '$REPO_ROOT' && $0 client" Enter
  tmux split-window -t "$SESSION" -v
  tmux send-keys -t "$SESSION" "sleep 2 && $0 info" Enter
  
  tmux attach-session -t "$SESSION"
  
  echo ""
  echo "[test] Session ended. Running cleanup..."
  cleanup_namespaces
}

# Main
case "${1:-}" in
  setup) setup_namespaces ;;
  cleanup) cleanup_namespaces ;;
  host) launch_host ;;
  client) launch_client ;;
  info) show_info ;;
  test) test_with_tmux ;;
  set-delay) shift; set_delay "$@" ;;
  *) usage ;;
esac
