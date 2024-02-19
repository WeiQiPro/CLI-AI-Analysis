export class Game {
  constructor(gameData = {}) {
    const defaultGameData = {
      fileFormat: 4,
      characterEncoding: "UTF-8",
      gameType: 1,
      date: "",
      place: "",
      gameName: "",
      blackName: "",
      whiteName: "",
      blackRank: "",
      whiteRank: "",
      timeLimit: "",
      overtimeFormat: "",
      result: "",
      boardSize: 19,
      komi: 7.5,
      rules: "Chinese",
      initStones: [],
      moves: [],
      moveCounter: 0,
    };

    Object.assign(this, { ...defaultGameData, ...gameData });
  }

  getInitStones() {
    return this.initStones;
  }

  getKomi() {
    return this.komi;
  }
  getMoveCounter() {
    return this.moveCounter;
  }
  getMoves() {
    let currentmoves = [];

    for (let i = 0; i < this.moveCounter; i++) {
      const color = this.moves[i].color;
      const coor = this.moves[i].coor;
      currentmoves.push([color, coor]);
    }
    return currentmoves;
  }

  getAllMoves() {
    return this.moves;
  }

  getRules() {
    return this.rules;
  }

  addMoveCounter() {
    this.moveCounter++;
  }

  addComment(moveIndex, comment) {
    this.moves[moveIndex]["comment"] = comment;
  }

  addVariation(moveIndex, variation) {
    this.moves[moveIndex]["variation"].push(variation);
  }
}

export class ParseSGF {
  static letters = "abcdefghjklmnopqrst";

  static parseSGFToGame(sgfContent) {
    let gameData = {
      initStones: [],
      moves: [],
    };

    sgfContent
      .split(";")
      .slice(1)
      .forEach((node) => {
        const keyValuePairs = node.match(/([A-Z]+)\[([^\]]*)\]/g) || [];
        keyValuePairs.forEach((pair) => {
          const [key, value] = pair
            .split("[")
            .map((part) => part.replace("]", ""));
          ParseSGF.parseSGFNode(key, value, gameData);
        });
      });

    return new Game(gameData);
  }

  static parseSGFNode(key, value, gameData) {
    const keyMap = {
      FF: "fileFormat",
      CA: "characterEncoding",
      GM: "gameType",
      DT: "date",
      PC: "place",
      GN: "gameName",
      PB: "blackName",
      PW: "whiteName",
      BR: "blackRank",
      WR: "whiteRank",
      TM: "timeLimit",
      OT: "overtimeFormat",
      RE: "result",
      SZ: "boardSize",
      KM: "komi",
      RU: "rules",
    };

    if (key in keyMap) {
      gameData[keyMap[key]] = ["FF", "GM", "SZ"].includes(key)
        ? parseInt(value)
        : key === "KM"
        ? parseFloat(value)
        : value;
    } else {
      switch (key) {
        case "AB":
        case "AW":
          gameData.initStones.push({
            color: key === "AB" ? "B" : "W",
            coor: value,
          });
          break;
        case "B":
        case "W":
          gameData.moves.push({
            color: key,
            coor: ParseSGF.SGFtoCoords(value),
            comment: "",
            variation: [],
          });
          break;
        case "C":
          if (gameData.moves.length > 0) {
            gameData.moves[gameData.moves.length - 1].comment = value;
          }
          break;
      }
    }
  }

  static shiftLetterIfNecessary(letter) {
    const index = this.letters.indexOf(letter);

    if (letter >= "i") {
      if (index + 1 < this.letters.length) {
        return this.letters[index + 1];
      } else {
        throw new Error("Invalid SGF coordinate: cannot shift beyond 't'");
      }
    }

    return letter;
  }

  static SGFtoCoords(value) {
    if (value.length !== 2) {
      throw new Error("Invalid SGF coordinate length");
    }

    const xChar = ParseSGF.shiftLetterIfNecessary(value[0].toLowerCase());
    const yChar = ParseSGF.shiftLetterIfNecessary(value[1].toLowerCase());

    const x = ParseSGF.letters.indexOf(xChar) + 1;
    const y = 18 - ParseSGF.letters.indexOf(yChar) + 1;

    const letterPart = xChar.toUpperCase();

    return `${letterPart}${y}`;
  }
}
