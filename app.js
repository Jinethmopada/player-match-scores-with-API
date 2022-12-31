const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
const app = express();
app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbAPI1Object = (objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: objectItem.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersList = `SELECT * FROM player_details`;
  const playersListResponse = await db.all(getPlayersList);
  response.send(
    playersListResponse.map((eachPlayer) => convertDbAPI1Object(eachPlayer))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getByPlayerId = `SELECT * FROM player_details 
    WHERE player_id= ${playerId}`;
  const playerIdResponse = await db.get(getByPlayerId);
  response.send(convertDbAPI1Object(playerIdResponse));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayer = `UPDATE player_details 
    SET player_name= '${playerName}' WHERE player_id = '${playerId}'; `;
  const updatePlayerResponse = await db.run(updatePlayer);
  response.send(`Player Details Updated`);
});

const convertMatchDbObject = (objectItem) => {
  return {
    matchId: objectItem.match_id,
    match: objectItem.match,
    year: objectItem.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getByMatchId = `SELECT * FROM match_details 
    WHERE match_id = '${matchId}'`;
  const getMatchIdResponse = await db.get(getByMatchId);
  response.send(convertMatchDbObject(getMatchIdResponse));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchDetails = `SELECT * FROM player_match_score 
    WHERE player_id = '${playerId}'`;
  const getPlayerMatchResponse = await db.all(getPlayerMatchDetails);
  const matchesArr = getPlayerMatchResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getPlayerOtherDetails = `SELECT * FROM match_details 
  WHERE match_id IN (${matchesArr});`;
  const fetchResponseForMatch = await db.all(getPlayerOtherDetails);
  response.send(
    fetchResponseForMatch.map((eachMatch) => convertMatchDbObject(eachMatch))
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatch = `
    SELECT *
        FROM player_match_score
           NATURAL JOIN player_details
    WHERE match_id=${matchId};`;
  const getPlayersOfMatchResponse = await db.all(getPlayersOfMatch);
  response.send(
    getPlayersOfMatchResponse.map((eachPlayer) =>
      convertDbAPI1Object(eachPlayer)
    )
  );
});

const convertMatchScoreDbObject = (playerName, objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: playerName,
    totalScore: objectItem.totalScore,
    totalFours: objectItem.totalFours,
    totalSixes: objectItem.totalSixes,
  };
};

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await db.get(getPlayerStatisticsQuery);
  response.send(
    convertMatchScoreDbObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});
module.exports = app;
