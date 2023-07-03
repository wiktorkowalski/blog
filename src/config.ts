import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://blog.wiktorkowalski.pl",
  author: "Wiktor Kowalski",
  desc: "A developer blog based on AstroPaper theme",
  title: `Wiktor Kowalski`,
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 5,
};

export const LOCALE = ["en-EN"]; // set to [] to use the environment default

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/wiktorkowalski",
    linkTitle: "Github",
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/wiktor-kowalski/",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:mail@wiktorkowalski.pl",
    linkTitle: "Mail",
    active: true,
  },
  {
    name: "Twitter",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Twitter`,
    active: false,
  },
  {
    name: "Discord",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Discord`,
    active: false,
  },
  {
    name: "Steam",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Steam`,
    active: false,
  },
  {
    name: "Website",
    href: "https://wiktorkowalski.pl",
    linkTitle: "Personal Website",
    active: true,
  },
];
