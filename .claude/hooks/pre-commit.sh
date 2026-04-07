#!/bin/bash
# Claude Code pre-commit hook
# Runs lint-staged to check staged files before committing

npx lint-staged
npx tsc --noEmit --pretty
