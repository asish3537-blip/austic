"use client";

import { useState, type FormEvent } from "react";

export function AvailabilityCheck() {
  const [message, setMessage] = useState("");

  function checkAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Pausstik has not published launch areas or opened online ordering yet. Your location stays on this device and was not sent or saved.");
  }

  return (
    <>
      <form className="availability-form" onSubmit={checkAvailability}>
        <label className="visually-hidden" htmlFor="availability-city">Your city</label>
        <input id="availability-city" name="city" placeholder="Your city" autoComplete="address-level2" required maxLength={100} />
        <label className="visually-hidden" htmlFor="availability-neighbourhood">Neighbourhood or PIN code</label>
        <input id="availability-neighbourhood" name="neighbourhood" placeholder="Neighbourhood or PIN code" autoComplete="postal-code" required maxLength={100} />
        <button className="button" type="submit">Check launch status</button>
      </form>
      {message && <p className="availability-message" role="status">{message}</p>}
    </>
  );
}
