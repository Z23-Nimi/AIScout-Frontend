const file = "/csvs/current.csv";
const constantFile = "/csvs/constant_data.csv";

Promise.all([
  fetch(file).then(response => response.text()),
  fetch(constantFile).then(response => response.text())
]).then(([currentData, constantData]) => {
  Papa.parse(currentData, {
    header: true,
    complete: function (currentResults) {
      Papa.parse(constantData, {
        header: true,
        complete: function (constantResults) {
          const data = currentResults.data;
          const constantMap = {};
          
          // Map constant data by team number
          constantResults.data.forEach(row => {
            const teamNumber = row["Team_num"]?.trim();
            if (teamNumber) {
              constantMap[teamNumber] = {
                team: row["team"]?.trim() || "Unknown",
                mobilityValue: (parseFloat(row["auto_yes%"] || 0) * 2) / 100,
                coralPercents: [
                  Math.round(parseFloat(row["coral_l1_percent"] || 0)),
                  Math.round(parseFloat(row["coral_l2_percent"] || 0)),
                  Math.round(parseFloat(row["coral_l3_percent"] || 0)),
                  Math.round(parseFloat(row["coral_l4_percent"] || 0))
                ],
                avgCoralValue: parseFloat(row["average_coral_value"] || 0),
                avgEndgameValue: parseFloat(row["average_endgame_value"] || 0)
              };
            }
          });
          
          const teams = {}; // Object to store aggregated team data
          
          data.forEach(row => {
            const teamNumber = row["team number"]?.trim();
            const coralCycles = parseFloat(row["coral cycles"]) || 0;
            const algaeCycles = parseFloat(row["algae cycles"]) || 0;
            const comment = row["comments"]?.trim() || "";
            
            if (!teamNumber) return; // Skip invalid rows
            
            if (!teams[teamNumber]) {
              teams[teamNumber] = {
                teamNumber,
                totalCoralCycles: 0,
                totalAlgaeCycles: 0,
                commentList: [],
                count: 0,
                ...constantMap[teamNumber] // Merge constant data
              };
            }
            
            const team = teams[teamNumber];
            
            // Aggregate data
            team.totalCoralCycles += coralCycles;
            team.totalAlgaeCycles += algaeCycles;
            if (comment) team.commentList.push(comment);
            team.count++;
          });
          
          // Convert object to array and calculate averages
          const teamsArray = Object.values(teams).map(team => {
            const avgCoralCycles = team.totalCoralCycles / team.count;
            const avgAlgaeCycles = team.totalAlgaeCycles / team.count;
            const avgCoralPoints = avgCoralCycles * team.avgCoralValue;
            const avgAlgaePoints = avgAlgaeCycles * 4;
            const totalScore = avgCoralPoints + avgAlgaePoints + team.mobilityValue + team.avgEndgameValue;
            
            return {
              ...team,
              avgCoralCycles,
              avgAlgaeCycles,
              avgCoralPoints,
              avgAlgaePoints,
              totalScore
            };
          });
          
          // Sort teams by totalScore
          teamsArray.sort((a, b) => b.totalScore - a.totalScore);
          
          // Display results
          const container = document.getElementById("teamsContainer");
          container.innerHTML = "";
          
          teamsArray.forEach(team => {
            const teamDiv = document.createElement("div");
            teamDiv.innerHTML = `
              <h3>Team ${team.teamNumber} - ${team.team}</h3>
              <p>Avg Coral Cycles: ${team.avgCoralCycles.toFixed(2)}</p>
              <p>Avg Algae Cycles: ${team.avgAlgaeCycles.toFixed(2)}</p>
              <p>Coral Level Distribution: ${team.coralPercents.join("% / ")}%</p>
              <p>Avg Coral Points: ${team.avgCoralPoints.toFixed(2)}</p>
              <p>Avg Algae Points: ${team.avgAlgaePoints.toFixed(2)}</p>
              <p>Mobility Value: ${team.mobilityValue.toFixed(2)}</p>
              <p>Avg Endgame Value: ${team.avgEndgameValue.toFixed(2)}</p>
              <p>Total Score: ${team.totalScore.toFixed(2)}</p>
              <p>Comments: ${team.commentList.join(", ") || "None"}</p>
            `;
            container.appendChild(teamDiv);
          });
        }
      });
    }
  });
});
