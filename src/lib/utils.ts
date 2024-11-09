import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


type ColorEnum =
  | 'reset'
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white';
export const lg = (
  message: string | null | undefined | any,
  color: ColorEnum = 'reset'
) => {
  const colorCodes = {
    reset: '\x1b[0m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };

  // Get the color code
  const colorCode = colorCodes[color] || colorCodes.reset;
  const logMessage = `${colorCode}${message}${colorCodes.white}`;
  console.log(colorCode, message, colorCodes.white);
};