const leaderboard =
    document.getElementById("leaderboard");


async function loadLeaderboard() {

    const {
        data: {
            user
        }
    } = await db.auth.getUser();


    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    const {
        data,
        error
    } = await db
        .from("leaderboard")
        .select(`
            rank,
            team_name,
            team_players,
            total_points
        `)
        .order("rank", {
            ascending: true
        });


    if (error) {

        leaderboard.innerHTML = `
            <div class="message error">
                Unable to load leaderboard.
            </div>
        `;

        console.error(error);

        return;
    }


    if (!data || data.length === 0) {

        leaderboard.innerHTML = `
            <p>
                No teams have been created yet.
            </p>
        `;

        return;
    }


    let html = `

        <div class="leaderboard-header">

            <div>
                Rank
            </div>

            <div>
                Team Name
            </div>

            <div>
                Team Players
            </div>

            <div>
                Total Wins
            </div>

        </div>

    `;


    data.forEach(team => {

        html += `

            <div class="leaderboard-row">

                <div>
                    ${team.rank}
                </div>

                <div>
                    ${escapeHTML(team.team_name)}
                </div>

                <div>
                    ${escapeHTML(team.team_players)}
                </div>

                <div>
                    ${team.total_points}
                </div>

            </div>

        `;

    });


    leaderboard.innerHTML = html;

}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


loadLeaderboard();