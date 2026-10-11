# Daily screen schedule on rondo

The mobile controller's Display menu includes time pickers for daily screen-off
and screen-on times. Times use the mirror's system time zone (America/Los_Angeles
on rondo). The default interval is midnight to 7am; overnight and daytime intervals
are supported. Saving immediately applies the current scheduled display state.

## Install on rondo

Run as the desktop user `rondo` from this module directory:

```sh
mkdir -p ~/.local/bin ~/.config/systemd/user
install -m 755 deploy/screen-schedule/mirror-night-schedule ~/.local/bin/
cp deploy/screen-schedule/mirror-night-schedule.service ~/.config/systemd/user/
cp deploy/screen-schedule/mirror-night-schedule.timer ~/.config/systemd/user/
# Initial defaults only; keep an existing saved schedule.
test -f ../../config/screen-schedule.json || cp deploy/screen-schedule/screen-schedule.json ../../config/
systemctl --user daemon-reload
systemctl --user enable --now mirror-night-schedule.timer
systemctl --user start mirror-night-schedule.service
systemctl --user restart magicmirror.service
```

Add this item to the Display menu's `items` array in
`MagicMirror/config/youtube-menu.json`:

```json
{"id":"screen-schedule","type":"screen-schedule","icon":"clock-o","text":"Screen schedule"}
```

The server runs as rondo with `XDG_RUNTIME_DIR=/run/user/1000` and
`WAYLAND_DISPLAY=wayland-0`. It needs NetworkManager-independent `wlopm` display
control and access to the user's systemd manager. The supplied files target the
existing `/home/rondo/MagicMirror` installation. Motion wake is bypassed on rondo;
resuming motion wake can override scheduled screen-off state.

GET/POST `/remote-screen-schedule` follow the controller's network allowlist.
POST requires JSON and rejects cross-origin browser requests. Times are validated;
equal times are rejected. Save operations are serialized, write files atomically,
and restore the previous configuration and timer if application fails. The user
timer runs at both boundaries and shortly after login, catching missed events
with `Persistent=true`. Existing manual screen controls remain available.

## Validation

- `node --test tests/unit/screenSchedule.test.js`
- Python schedule boundaries checked for all 1440 daily minutes with midnight,
  overnight and daytime intervals.
- Browser save changed 23:30/07:15 in the actual timer, then restored 00:00/07:00.
- Reload preserved saved times; 390px mobile layout inspected.
- Invalid schedule returned HTTP 400; cross-origin POST returned HTTP 403.
