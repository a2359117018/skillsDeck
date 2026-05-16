; Custom NSIS script for electron-builder
; Replaces the default welcome page with welcome + usage declaration.
; The Apache 2.0 license page follows from electron-builder.yml's `license` setting.

!macro customWelcomePage
  ; Standard MUI welcome page
  !insertmacro MUI_PAGE_WELCOME

  ; Usage declaration page (shown before the Apache 2.0 license)
  ; Path relative to project root (NSIS compile working directory)
  !insertmacro MUI_PAGE_LICENSE "build\declaration.txt"
!macroend
