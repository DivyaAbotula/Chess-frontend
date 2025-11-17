export function exportPGN(history) {
  return history.map((move, i) => `${Math.floor(i/2)+1}. ${move}`).join(" ");
}
