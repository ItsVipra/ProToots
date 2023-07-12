export PATH := "./node_modules/.bin:" + env_var('PATH')

set windows-shell := ["powershell.exe"]

alias build := package
alias dev := start-firefox
alias start := start-firefox

default: lint format

# Runs eslint in the repository.
lint:
    eslint src/

# Formats all files according to the prettier rules.
format:
    prettier --write --ignore-path .gitignore .

[private]
[unix]
build-for target="firefox":
    TARGET={{ target }} node scripts/build.mjs

[private]
[windows]
build-for target="firefox":
    $Env:TARGET="{{ target }}"; node scripts/build.mjs

[private]
package-for target: (build-for target)
    web-ext build --filename protoots-{{ target }}.zip --overwrite-dest

# Builds all webextension packages for the different browsers.
package: (package-for "firefox") (package-for "chrome")

[private]
[unix]
watch target:
    TARGET={{ target }} node scripts/watch.mjs

[private]
[windows]
watch target:
    $Env:TARGET="{{ target }}"; node scripts/watch.mjs

# Starts the Firefox browser for development.
[unix]
start-firefox:
    just watch firefox &
    web-ext run

# Starts the Chrome/Chromium browser for development.
[unix]
start-chrome:
    just watch chrome &
    web-ext run --target chromium

[windows]
start-firefox:
    Start-Process -NoNewWindow just watch firefox
    web-ext run

[windows]
start-chrome:
    Start-Process -NoNewWindow just watch chrome
    web-ext run --target chromium
