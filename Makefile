ROOT_DIR := $(shell pwd)
ADMIN_DIR := $(ROOT_DIR)

.PHONY: tab

tab:
	@osascript \
		-e 'tell application "Terminal"' \
		-e 'activate' \
		-e 'if (count of windows) = 0 then' \
		-e '  do script "cd $(ADMIN_DIR) && pnpm start"' \
		-e 'else' \
		-e '  if miniaturized of window 1 then set miniaturized of window 1 to false' \
		-e '  tell application "System Events" to tell process "Terminal" to keystroke "t" using command down' \
		-e '  delay 0.8' \
		-e '  do script "cd $(ADMIN_DIR) && pnpm start" in front window' \
		-e 'end if' \
		-e 'end tell'


