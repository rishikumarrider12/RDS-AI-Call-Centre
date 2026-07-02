export function cn(...classes: (string | undefined | false | 0)[]) {
  return classes.filter(Boolean).join(' ')
}
