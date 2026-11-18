export type Menu = any;
export function hotIssue(menu: Menu, isOn: (p: string) => boolean, now?: Date): { href: string; label: string } | null;
export function coreNav(menu: Menu, isOn: (p: string) => boolean): { id: string; label: string; href: string }[];
export function categories(menu: Menu, isOn: (p: string) => boolean): any[];
export function navHtml(menu: Menu, isOn: (p: string) => boolean, opts?: { active?: string }, now?: Date): string;
export function allBtnHtml(): string;
export function megaInnerHtml(menu: Menu, isOn: (p: string) => boolean, now?: Date): string;
export function mobileListHtml(menu: Menu, isOn: (p: string) => boolean, now?: Date): string;
export function footerHtml(menu: Menu, isOn: (p: string) => boolean, extraNote?: string): string;
