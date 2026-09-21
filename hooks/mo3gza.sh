#!/usr/bin/env bash
# UserPromptSubmit: "mo3gza" in a prompt turns the mode on for this session;
# "mo3gza off" turns it off. While on, every prompt gets a reminder injected.
set -u
in=$(cat)
sid=$(printf '%s' "$in" | jq -r '.session_id // "nosession"')
prompt=$(printf '%s' "$in" | jq -r '.prompt // ""')
dir="${TMPDIR:-/tmp}/claude-mo3gza"; mkdir -p "$dir"
marker="$dir/$sid"

lower=$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')
case "$lower" in
  *"mo3gza off"*|*"mo3gza stop"*|*"stop mo3gza"*)
    rm -f "$marker"
    printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"MO3GZA MODE OFF — return to normal behavior; say \\"mo3gza mode off.\\" once."}}\n'
    exit 0 ;;
  *mo3gza*)
    touch "$marker" ;;
esac

if [ -f "$marker" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"MO3GZA MODE ACTIVE for this session — follow the mo3gza skill (invoke it via the Skill tool if it is not already loaded in context). Superpowers process, Context7 for library APIs, impeccable for UI, reviewer agents before finishing, decide-don’t-ask."}}\n'
fi
exit 0
