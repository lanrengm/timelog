import React, { useState } from "react";

export function Clock({time}: {time: string}) {
  return <div className="tl-clock">{time}</div>;
}
