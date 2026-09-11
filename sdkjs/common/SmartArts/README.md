# SmartArt templates

`SmartArts.bin` is the native template bundle required by the ONLYOFFICE 7.5 SDK
shipped with this project. The SDK requests it lazily when a SmartArt category is
opened. Without the bundle, the categories have no previews and cannot insert a
diagram.

The binary is copied without modification from the official ONLYOFFICE SDK:

- Source: https://github.com/ONLYOFFICE/sdkjs/blob/cb12f3d2b72dcad047185dad4488e19158fb6dd7/common/SmartArts/SmartArts.bin
- Commit: `cb12f3d2b72dcad047185dad4488e19158fb6dd7`
- Size: `10485760` bytes
- SHA-256: `5561c661c80d2a996d4fd3fb49c056f23cb434d1d81632c22aa6372b22561c9f`
- License: GNU AGPL v3, as supplied by ONLYOFFICE; see the repository's `LICENSE`.

Keep the bundle under `public/sdkjs/common/SmartArts/` so Vite copies it into the
same path in production, including GitHub Pages deployments under `/Waltiva/`.
The editor can then load templates from its own origin without a remote service.
Newer SDK versions use a different, split template format; do not substitute
their assets without updating the SDK and its loader together.
