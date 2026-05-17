import { useEffect, useState } from "react";
import { useMultiplayerStore } from "../store/multiplayerStore";
import { useGameStore } from "../store";
import type { MultiplayerBridge, MultiplayerGameState } from "../types/multiplayer";