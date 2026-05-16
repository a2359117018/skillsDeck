; Custom NSIS script for electron-builder
; Inserts a welcome page and usage declaration license page before the standard license page

!macro customWelcomePage
  ; Standard MUI welcome page
  !insertmacro MUI_PAGE_WELCOME

  ; Usage declaration page (shown before the Apache 2.0 license)
  ; File path is relative to this script file (build/installer.nsh)
  !insertmacro MUI_PAGE_LICENSE "declaration.txt"
!macroend
