// lib/auth/constants.ts
//
// File ini SENGAJA tidak mengimpor apa pun (terutama bukan `next/headers`),
// agar aman diimpor langsung dari middleware.ts (Edge runtime) tanpa
// menyeret dependency yang tidak kompatibel Edge ke dalam bundle-nya.

export const SESSION_COOKIE_NAME = "sipanda_session";
