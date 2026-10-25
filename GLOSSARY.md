# Real Live

Real Live is a fullscreen, in-browser camera monitor. This glossary pins the language we use for its camera concepts.

## Language

**Facing**:
Which side of the device a camera points at: `user` (front) or `environment` (rear). Facing, not a device identity, is the unit of the user's persisted camera preference.
_Avoid_: orientation (means screen rotation), direction

**Rear camera**:
The camera cluster on the back of the device, i.e. any camera whose facing is `environment`.
_Avoid_: back camera (in our own copy), main camera

**Front camera**:
The camera facing the user, conventionally mirrored in preview.
_Avoid_: selfie camera

**Flip**:
The mobile action of toggling between the front camera and the rear camera. Flip has exactly two positions; it never rotates through individual devices.
_Avoid_: switch, toggle, cycle

**Cycle**:
The desktop camera-control behaviour that rotates through every enumerated video input one by one.
_Avoid_: flip (mobile semantics), switch

**Mirror**:
A display-only horizontal flip of the preview (and of snapshots). Mirror follows the camera side: on for the front camera, off for the rear camera; the user can still override it manually.
_Avoid_: flip (reserved for camera switching), reflection

**Mobile**:
In Real Live, a device whose primary pointer is coarse (touch). On mobile, the camera control flips; elsewhere, it cycles.
_Avoid_: phone, touch device
