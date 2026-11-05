"use client";

import Image from "next/image";
import { useState } from "react";

export function TeamPhoto() {
  const [imageAvailable, setImageAvailable] = useState(true);

  return (
    <div
      className={`team-photo${imageAvailable ? " has-image" : ""}`}
      role="img"
      aria-label="Foto bersama tim PantauBencana"
    >
      {imageAvailable && (
        <Image
          src="/team-photo.jpeg"
          alt="Foto bersama Y. Capelliou Samudra dan Rasti Oktavianny W."
          width={1500}
          height={1000}
          sizes="(max-width: 680px) calc(100vw - 36px), calc(100vw - 56px)"
          onError={() => setImageAvailable(false)}
        />
      )}
      {!imageAvailable && (
        <>
          <span className="eyebrow">TIM PANTAUBENCANA</span>
          <strong>Ruang foto bersama</strong>
          <p>
            Tambahkan file <code>public/team-photo.jpeg</code> untuk
            menampilkan foto tim.
          </p>
        </>
      )}
    </div>
  );
}
