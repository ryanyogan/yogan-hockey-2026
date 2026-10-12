const ring =
  "outline-none focus-visible:outline-2 focus-visible:outline-kicker focus-visible:outline-solid";

/** The focus ring of every primitive: the prototype's 2px of the one red, 2px off the control. */
const focusRing = `${ring} focus-visible:outline-offset-2`;

/**
 * The same ring drawn inside the control, for one in a box that clips what is outside it (a
 * strip of tabs that scrolls). One or the other: a class holds a single offset.
 */
const focusRingInside = `${ring} focus-visible:-outline-offset-2`;

export { focusRing, focusRingInside };
