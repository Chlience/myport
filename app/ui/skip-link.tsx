"use client";

import { useLanguage } from "./i18n";

export function SkipLink() {
  const { copy } = useLanguage();

  return (
    <a className="skip-link" href="#main-content">
      {copy.skipToMain}
    </a>
  );
}
