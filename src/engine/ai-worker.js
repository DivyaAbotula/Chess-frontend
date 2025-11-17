importScripts('./ai.js');

onmessage = function (e) {
  const { board } = e.data;
  const move = bestMove(board);
  postMessage(move);
};
