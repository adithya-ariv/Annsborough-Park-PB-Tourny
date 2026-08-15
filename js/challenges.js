// =========================================================
// CHALLENGES PAGE
// =========================================================


const teamSelect =
    document.getElementById("team-select");

const matchDate =
    document.getElementById("match-date");

const matchTime =
    document.getElementById("match-time");

const challengeForm =
    document.getElementById("challenge-form");

const challengeMessage =
    document.getElementById("challenge-message");

const incomingChallenges =
    document.getElementById("incoming-challenges");

const stageOne =
    document.getElementById("stage-one");

const stageTwo =
    document.getElementById("stage-two");

const logoutButton =
    document.getElementById("logout-button");

const cancelButton =
    document.getElementById("cancel-match-button");

const cancelMessage =
    document.getElementById("cancel-message");


// =========================================================
// USER
// =========================================================

let currentUser = null;

let currentTeamId = null;


// =========================================================
// LOAD PAGE
// =========================================================

async function loadChallengesPage() {

    const {
        data: {
            user
        },
        error
    } = await db.auth.getUser();


    if (error || !user) {

        window.location.href =
            "login.html";

        return;
    }


    currentUser = user;


    // Get user's team

    const {
        data: teamId,
        error: teamError
    } = await db.rpc(
        "get_user_team_id"
    );


    if (teamError) {

        console.error(teamError);

        alert(teamError.message);

        return;
    }


    currentTeamId = teamId;


    if (!currentTeamId) {

        stageOne.innerHTML = `

            <section class="card">

                <h2>
                    You need a team
                </h2>

                <p>
                    You must be on a team before you can
                    challenge or accept another team.
                </p>

                <a
                    href="dashboard.html"
                    class="button"
                >
                    Go to Dashboard
                </a>

            </section>

        `;

        return;
    }


    setDateMinimum();

    generateTimes();

    await loadTeams();

    await loadChallenges();

    await checkActiveMatch();


    // Refresh every 10 seconds

    setInterval(
        async function() {

            await loadChallenges();

            await checkActiveMatch();

        },
        10000
    );

}


// =========================================================
// DATE MINIMUM
// =========================================================

function setDateMinimum() {

    const today =
        new Date();


    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    const todayString =
        `${year}-${month}-${day}`;


    matchDate.min =
        todayString;


    matchDate.value =
        todayString;

}


// =========================================================
// GENERATE 30 MINUTE TIMES
// =========================================================

function generateTimes() {

    matchTime.innerHTML = `

        <option value="">
            Select a time
        </option>

    `;


    // 12:00 AM through 11:30 PM

    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        for (
            let minute of [0, 30]
        ) {

            const value =
                `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;


            const label =
                formatTime(hour, minute);


            const option =
                document.createElement("option");


            option.value =
                value;

            option.textContent =
                label;


            matchTime.appendChild(
                option
            );

        }

    }

}


// =========================================================
// FORMAT TIME
// =========================================================

function formatTime(
    hour,
    minute
) {

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    let displayHour =
        hour % 12;


    if (displayHour === 0) {
        displayHour = 12;
    }


    return `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`;

}


// =========================================================
// LOAD TEAMS
// =========================================================

async function loadTeams() {

    const {
        data: teams,
        error
    } = await db
        .from("teams")
        .select("id, name")
        .neq("id", currentTeamId)
        .order("name");


    if (error) {

        console.error(error);

        teamSelect.innerHTML = `

            <option value="">
                Unable to load teams
            </option>

        `;

        return;
    }


    teamSelect.innerHTML = `

        <option value="">
            Select a team
        </option>

    `;


    teams.forEach(
        team => {

            const option =
                document.createElement("option");


            option.value =
                team.id;

            option.textContent =
                team.name;


            teamSelect.appendChild(
                option
            );

        }
    );


    if (teams.length === 0) {

        teamSelect.innerHTML = `

            <option value="">
                No other teams available
            </option>

        `;

    }

}


// =========================================================
// CREATE CHALLENGE
// =========================================================

challengeForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const targetTeam =
            teamSelect.value;

        const selectedDate =
            matchDate.value;

        const selectedTime =
            matchTime.value;


        challengeMessage.textContent =
            "Sending challenge...";

        challengeMessage.className =
            "message";


        const {
            error
        } = await db.rpc(
            "create_challenge",
            {
                target_team_id:
                    targetTeam,

                selected_date:
                    selectedDate,

                selected_time:
                    selectedTime
            }
        );


        if (error) {

            console.error(error);

            challengeMessage.textContent =
                error.message;

            challengeMessage.className =
                "message error";

            return;
        }


        challengeMessage.textContent =
            "Challenge sent!";

        challengeMessage.className =
            "message success";


        challengeForm.reset();

        setDateMinimum();

        generateTimes();


        await loadChallenges();

    }
);


// =========================================================
// LOAD CHALLENGES
// =========================================================

async function loadChallenges() {

    const {
        data: challenges,
        error
    } = await db
        .from("challenges")
        .select(`
            id,
            challenger_team_id,
            challenged_team_id,
            match_date,
            match_time,
            status,
            created_at
        `)
        .eq(
            "challenged_team_id",
            currentTeamId
        )
        .eq(
            "status",
            "pending"
        )
        .order(
            "match_date",
            {
                ascending: true
            }
        )
        .order(
            "match_time",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(error);

        incomingChallenges.innerHTML = `

            <p class="message error">
                ${escapeHTML(error.message)}
            </p>

        `;

        return;
    }


    if (
        !challenges ||
        challenges.length === 0
    ) {

        incomingChallenges.innerHTML = `

            <p class="no-challenges">
                No pending challenges.
            </p>

        `;

        return;
    }


    incomingChallenges.innerHTML = "";


    for (
        const challenge of challenges
    ) {

        const teamName =
            await getTeamName(
                challenge.challenger_team_id
            );


        const card =
            document.createElement("div");


        card.className =
            "incoming-challenge";


        card.innerHTML = `

            <div class="incoming-info">

                <h3>
                    ${escapeHTML(teamName)}
                </h3>

                <p>
                    wants to challenge your team
                </p>

                <p>
                    <strong>
                        ${formatDate(challenge.match_date)}
                    </strong>

                    at

                    <strong>
                        ${formatDisplayTime(challenge.match_time)}
                    </strong>
                </p>

            </div>


            <div class="challenge-actions">

                <button
                    class="accept-button"
                    data-id="${challenge.id}"
                >
                    Accept
                </button>

                <button
                    class="decline-button"
                    data-id="${challenge.id}"
                >
                    Decline
                </button>

            </div>

        `;


        incomingChallenges.appendChild(
            card
        );

    }


    // Add button listeners

    document
        .querySelectorAll(".accept-button")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => acceptChallenge(
                        button.dataset.id
                    )
                );

            }
        );


    document
        .querySelectorAll(".decline-button")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => declineChallenge(
                        button.dataset.id
                    )
                );

            }
        );

}


// =========================================================
// ACCEPT
// =========================================================

async function acceptChallenge(
    challengeId
) {

    const {
        error
    } = await db.rpc(
        "accept_challenge",
        {
            challenge_id:
                challengeId
        }
    );


    if (error) {

        alert(error.message);

        await loadChallenges();

        return;
    }


    await checkActiveMatch();

    await loadChallenges();

}


// =========================================================
// DECLINE
// =========================================================

async function declineChallenge(
    challengeId
) {

    const {
        error
    } = await db.rpc(
        "decline_challenge",
        {
            challenge_id:
                challengeId
        }
    );


    if (error) {

        alert(error.message);

        return;
    }


    await loadChallenges();

}


// =========================================================
// CHECK ACTIVE MATCH
// =========================================================

async function checkActiveMatch() {

    const {
        data: matches,
        error
    } = await db
        .from("challenges")
        .select(`
            id,
            challenger_team_id,
            challenged_team_id,
            match_date,
            match_time,
            status
        `)
        .eq(
            "status",
            "accepted"
        )
        .or(
            `challenger_team_id.eq.${currentTeamId},challenged_team_id.eq.${currentTeamId}`
        )
        .limit(1);


    if (error) {

        console.error(error);

        return;
    }


    if (
        !matches ||
        matches.length === 0
    ) {

        showStageOne();

        return;
    }


    const match =
        matches[0];


    await displayMatch(
        match
    );

}


// =========================================================
// DISPLAY MATCH
// =========================================================

async function displayMatch(
    match
) {

    showStageTwo();


    const teamOne =
        await getTeam(
            match.challenger_team_id
        );


    const teamTwo =
        await getTeam(
            match.challenged_team_id
        );


    document
        .getElementById(
            "team-one-name"
        )
        .textContent =
        teamOne.name;


    document
        .getElementById(
            "team-two-name"
        )
        .textContent =
        teamTwo.name;


    document
        .getElementById(
            "team-one-players"
        )
        .innerHTML =
        await getPlayersHTML(
            match.challenger_team_id
        );


    document
        .getElementById(
            "team-two-players"
        )
        .innerHTML =
        await getPlayersHTML(
            match.challenged_team_id
        );


    document
        .getElementById(
            "match-date-display"
        )
        .textContent =
        formatDate(
            match.match_date
        );


    document
        .getElementById(
            "match-time-display"
        )
        .textContent =
        formatDisplayTime(
            match.match_time
        );


    cancelButton.dataset.id =
        match.id;

}


// =========================================================
// CANCEL MATCH
// =========================================================

cancelButton.addEventListener(
    "click",
    async function() {

        const confirmed =
            confirm(
                "Are you sure you want to cancel this match?"
            );


        if (!confirmed) {
            return;
        }


        cancelMessage.textContent =
            "Cancelling match...";

        cancelMessage.className =
            "message";


        const {
            error
        } = await db.rpc(
            "cancel_match",
            {
                challenge_id:
                    cancelButton.dataset.id
            }
        );


        if (error) {

            cancelMessage.textContent =
                error.message;

            cancelMessage.className =
                "message error";

            return;
        }


        cancelMessage.textContent =
            "Match cancelled.";

        cancelMessage.className =
            "message success";


        await checkActiveMatch();

        await loadChallenges();

    }
);


// =========================================================
// GET TEAM
// =========================================================

async function getTeam(
    teamId
) {

    const {
        data: team
    } = await db
        .from("teams")
        .select(
            "id, name"
        )
        .eq(
            "id",
            teamId
        )
        .single();


    return team;

}


// =========================================================
// GET TEAM NAME
// =========================================================

async function getTeamName(
    teamId
) {

    const team =
        await getTeam(
            teamId
        );


    return team
        ? team.name
        : "Unknown Team";

}


// =========================================================
// GET PLAYERS
// =========================================================

async function getPlayersHTML(
    teamId
) {

    const {
        data: members,
        error
    } = await db
        .from("team_members")
        .select("user_id")
        .eq(
            "team_id",
            teamId
        );


    if (error) {

        return `
            <p>
                Unable to load players
            </p>
        `;

    }


    if (
        !members ||
        members.length === 0
    ) {

        return `
            <p>
                No players
            </p>
        `;

    }


    const ids =
        members.map(
            member => member.user_id
        );


    const {
        data: profiles
    } = await db
        .from("profiles")
        .select(
            "id, firstname"
        )
        .in(
            "id",
            ids
        );


    if (
        !profiles ||
        profiles.length === 0
    ) {

        return `
            <p>
                No players
            </p>
        `;

    }


    return profiles
        .map(
            profile => `
                <div class="match-player">
                    ${escapeHTML(profile.firstname)}
                </div>
            `
        )
        .join("");

}


// =========================================================
// STAGE SWITCHING
// =========================================================

function showStageOne() {

    stageOne.style.display =
        "block";

    stageTwo.style.display =
        "none";

}


function showStageTwo() {

    stageOne.style.display =
        "none";

    stageTwo.style.display =
        "block";

}


// =========================================================
// DATE FORMATTING
// =========================================================

function formatDate(
    dateString
) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );

}


// =========================================================
// TIME FORMATTING
// =========================================================

function formatDisplayTime(
    timeString
) {

    const parts =
        timeString.split(":");


    const hour =
        Number(parts[0]);

    const minute =
        Number(parts[1]);


    return formatTime(
        hour,
        minute
    );

}


// =========================================================
// HTML ESCAPING
// =========================================================

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================================
// LOGOUT
// =========================================================

logoutButton.addEventListener(
    "click",
    async function() {

        await db.auth.signOut();

        window.location.href =
            "index.html";

    }
);


// =========================================================
// START
// =========================================================

loadChallengesPage();