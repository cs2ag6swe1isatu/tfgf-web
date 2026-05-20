import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import MakerPortable from '@rabbitholesyndrome/electron-forge-maker-portable';
const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
  new MakerZIP({}, ['linux']), // ZIP for Linux only
  new MakerSquirrel({ setupExe: 'tfgf.exe' }), // Squirrel installer for Windows
  {
    name: '@rabbitholesyndrome/electron-forge-maker-portable',
    config: {
      appId: 'com.yourcompany.tfgf',
      portable: {
      artifactName: '${productName}-${version}-portable.exe'
    }
    }
  }
],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
