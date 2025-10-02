
export const getRandomString = (charCount: number): string => {
  const allowedChars = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890";
  let output = "";
  for (let i = 0; i < charCount; i++) {
    output += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
  }
  return output;
}
