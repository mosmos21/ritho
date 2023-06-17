import {
  Action,
  MovePieceAction,
  PieceColor,
  PlaceTileAction,
} from "@/types/ritho";
import { Ritho, RawRithoState } from "@/lib/ritho/system/types";
import { INITIAL_ACTION_COUNT } from "@/constants/ritho";
import { TILE_GRID_BORDER_BORDER_CELL_COUNT } from "@/constants";
import { sameCoord } from "@/utils/coord";

const isValidPlaceTileAction = (
  state: RawRithoState,
  { coord }: PlaceTileAction
) => {
  if (state.tileGrid.hasTile(coord)) return false;

  // NOTE: すでにあるタイルに接していれば動かせる
  return state.tileGrid.canPlaceTile(coord);
};

const isValidMovePieceAction = (
  state: RawRithoState,
  action: MovePieceAction
) => {
  const { from, to } = action;
  if (sameCoord(from, to)) return false;

  // NOTE: タイルを置いている途中の場合は駒を動かせない
  if (state.currentActions.length > 0) return false;

  // NOTE: そのターンの色の駒しか動かせない
  const fromPiece = state.pieceGrid.get(from);
  if (!fromPiece || fromPiece.color !== state.turn) return false;

  // NOTE: 目的の場所までの経路が存在しない場合は駒を動かせない
  if (!state.pieceGrid.canMovePiece(state.tileGrid, from, to)) return false;

  // NOTE: 同じ駒は連続で動かすことができない
  const prevAction = state.prevActions[0];
  return !(prevAction.type === "MovePiece" && sameCoord(prevAction.to, from));
};

const isValidAction =
  (state: RawRithoState) =>
  (action: Action): boolean => {
    switch (action.type) {
      case "PlaceTile":
        return isValidPlaceTileAction(state, action);
      case "MovePiece":
        return isValidMovePieceAction(state, action);
    }
  };

/**
 * 次のターンのプレイヤーを返す
 */
const nextTurn = (current: PieceColor) =>
  current === "Black" ? "White" : "Black";

/**
 * アクションを消費する、アクションがなくなったらターンを切り替える
 */
const consumeActionCount = (
  turn: PieceColor,
  count: number
): Pick<RawRithoState, "turn" | "restActionCount"> =>
  count === 1
    ? { turn: nextTurn(turn), restActionCount: INITIAL_ACTION_COUNT }
    : { turn, restActionCount: count - 1 };

const placeTileAction = (
  state: RawRithoState,
  action: PlaceTileAction
): RawRithoState => {
  if (!isValidPlaceTileAction(state, action)) return state;
  const { coord, tile } = action;

  let nextState = {
    ...state,
    tileGrid: state.tileGrid.set(coord, tile),
    restTileCount: {
      ...state.restTileCount,
      [tile]: state.restTileCount[tile] - 1,
    },
  };

  // NOTE: 一枚目のタイルを置く時は今のアクションを継続するので記録だけ残す
  // すでにタイルを置いているアクションの時はアクションを消費する
  if (state.currentActions.length === 0) {
    nextState.currentActions = [action];
  } else {
    nextState = {
      ...nextState,
      ...consumeActionCount(state.turn, state.restActionCount),
      currentActions: [],
      prevActions: [...state.currentActions, action],
    };
  }

  return nextState;
};

const movePieceAction = (
  state: RawRithoState,
  action: MovePieceAction
): RawRithoState => {
  if (!isValidMovePieceAction(state, action)) return state;

  const { from, to } = action;
  const toPiece = state.pieceGrid.get(to);

  const nextState = {
    ...state,
    ...consumeActionCount(state.turn, state.restActionCount),
    pieceGrid: state.pieceGrid.move(from, to),
    currentActions: [],
    prevActions: [action],
  };

  if (toPiece?.type === "King") {
    nextState.winner = state.turn;
  }

  return nextState;
};

const doAction =
  (state: RawRithoState) =>
  (action: Action): Ritho => {
    switch (action.type) {
      case "PlaceTile":
        return build(placeTileAction(state, action));
      case "MovePiece":
        return build(movePieceAction(state, action));
    }
    return build(state);
  };

export const build = (state: RawRithoState): Ritho => ({
  turn: state.turn,
  restActionCount: state.restActionCount,
  restTileCount: state.restTileCount,
  winner: state.winner,
  pieceCell: state.pieceGrid.toArray(),
  currentActions: [],
  prevActions: [],
  tileCell: state.tileGrid.toArray(TILE_GRID_BORDER_BORDER_CELL_COUNT),
  action: doAction(state),
  isValidAction: isValidAction(state),
});
