export const AnalysisComponent = ({id, initStones, moves, rules, komi}) => {
    return {
        id: id || "",
        initStones: initStones || [],
        moves: moves || [],
        rules: rules || "chinese",
        komi: komi || 7.5,
        boardXSize: 19,
        boardYSize: 19,
    }
}

export const AnalysisQuery = (ai, game) => {
    let query = AnalysisComponent({
        id: game.getMoveCounter(),
        initStones: game.getInitStones(),
        moves: game.getMoves(game.getMoveCounter()),
        rules: game.getRules(),
        komi: game.getKomi()
    })

    if ( analysis.maxVisits) query.maxVisits = analysis.maxVisits;

    ai.stdin.write(JSON.stringify())
    return ai.stdout.read()
}