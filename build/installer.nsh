; Custom NSIS script for electron-builder
; Replaces the default welcome page with welcome + usage declaration.
; The Apache 2.0 license page follows from electron-builder.yml's `license` setting.

!macro customWelcomePage
  ; Standard MUI welcome page
  !insertmacro MUI_PAGE_WELCOME

  ; Usage declaration page (shown before the Apache 2.0 license)
  ; Derive declaration.txt path from this script's location (${__FILE__})
  !searchreplace DECLARATION_PATH "${__FILE__}" "installer.nsh" "declaration.txt"
  !insertmacro MUI_PAGE_LICENSE "${DECLARATION_PATH}"
!macroend
