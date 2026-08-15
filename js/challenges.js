// =========================================================
// CHALLENGES PAGE
// =========================================================


// =========================================================
// ELEMENTS
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

const yourMatches =
    document.getElementById("your-matches");

const logoutButton =
    document.getElementById("logout-button");


// =========================================================
// VARIABLES
// =========================================================

let currentUser = null;

let currentTeamId = null;


// =========================================================
// START PAGE
// =========================================================

async function loadChallengesPage() {

    // Get logged-in user

    const {
        data: {
            user
        },
        error: userError
    } = await db.auth.getUser();


    if (userError || !user) {

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

        alert(
            teamError.message
        );

        return;
    }


    currentTeamId =
        teamId;


    // User isn't on a team

    if (!currentTeamId) {

        showNoTeamMessage();

        return;
    }


    // Set up page

    setDateMinimum();

    generateTimes();

    await loadTeams();

    await loadIncomingChallenges();

    await loadYourMatches();


    // Refresh challenges and matches

}


// =========================================================
// NO TEAM MESSAGE
// =========================================================

function showNoTeamMessage() {

    teamSelect.innerHTML = `

        <option value="">
            You need a team first
        </option>

    `;


    incomingChallenges.innerHTML = `

        <div class="no-challenges">

            <p>
                You need to be on a team before
                you can accept challenges.
            </p>

            <a
                href="dashboard.html"
                class="button"
            >
                Go to Dashboard
            </a>

        </div>

    `;


    yourMatches.innerHTML = `

        <div class="no-challenges">

            <p>
                You are not currently on a team.
            </p>

        </div>

    `;


    const form =
        document.getElementById(
            "challenge-form"
        );


    form.innerHTML = `

        <p>
            You must create or join a team
            before you can challenge another team.
        </p>

        <a
            href="dashboard.html"
            class="button"
        >
            Go to Dashboard
        </a>

    `;

}


// =========================================================
// MINIMUM DATE
// =========================================================

function setDateMinimum() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


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


    // 12:00 AM
    // 12:30 AM
    // 1:00 AM
    // ...
    // 11:30 PM

    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        for (
            const minute of [0, 30]
        ) {

            const hourString =
                String(hour)
                    .padStart(
                        2,
                        "0"
                    );


            const minuteString =
                String(minute)
                    .padStart(
                        2,
                        "0"
                    );


            const value =
                `${hourString}:${minuteString}:00`;


            const label =
                formatTime(
                    hour,
                    minute
                );


            const option =
                document.createElement(
                    "option"
                );


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

        displayHour =
            12;

    }


    return (
        `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`
    );

}


// =========================================================
// LOAD ALL OTHER TEAMS
// =========================================================

async function loadTeams() {

    const {
        data: teams,
        error
    } = await db
        .from("teams")
        .select(
            "id, name"
        )
        .neq(
            "id",
            currentTeamId
        )
        .order(
            "name"
        );


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
                document.createElement(
                    "option"
                );


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
// SEND CHALLENGE
// =========================================================

challengeForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const targetTeam =
            teamSelect.value;


        const selectedDate =
            matchDate.value;


        const selectedTime =
            matchTime.value;


        if (!targetTeam) {

            challengeMessage.textContent =
                "Please select a team.";

            challengeMessage.className =
                "message error";

            return;
        }


        if (!selectedDate) {

            challengeMessage.textContent =
                "Please select a date.";

            challengeMessage.className =
                "message error";

            return;
        }


        if (!selectedTime) {

            challengeMessage.textContent =
                "Please select a time.";

            challengeMessage.className =
                "message error";

            return;
        }


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
            "Challenge sent successfully!";


        challengeMessage.className =
            "message success";


        challengeForm.reset();


        setDateMinimum();

        generateTimes();


        await loadIncomingChallenges();

        await loadYourMatches();

    }
);


// =========================================================
// LOAD INCOMING CHALLENGES
// =========================================================

async function loadIncomingChallenges() {

    if (!currentTeamId) {
        return;
    }


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


    incomingChallenges.innerHTML =
        "";


    for (
        const challenge of challenges
    ) {

        const teamName =
            await getTeamName(
                challenge.challenger_team_id
            );


        const card =
            document.createElement(
                "div"
            );


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
                        ${formatDate(
                            challenge.match_date
                        )}
                    </strong>

                    at

                    <strong>
                        ${formatDisplayTime(
                            challenge.match_time
                        )}
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


    // Accept buttons

    document
        .querySelectorAll(
            ".accept-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async function () {

                        await acceptChallenge(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    // Decline buttons

    document
        .querySelectorAll(
            ".decline-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async function () {

                        await declineChallenge(
                            button.dataset.id
                        );

                    }
                );

            }
        );

}


// =========================================================
// ACCEPT CHALLENGE
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

        alert(
            error.message
        );


        await loadIncomingChallenges();

        await loadYourMatches();


        return;
    }


    await loadIncomingChallenges();

    await loadYourMatches();

}


// =========================================================
// DECLINE CHALLENGE
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

        alert(
            error.message
        );


        return;
    }


    await loadIncomingChallenges();

}


// =========================================================
// LOAD ALL YOUR MATCHES
// =========================================================

async function loadYourMatches() {

    if (!currentTeamId) {
        return;
    }


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
        status,
        challenger_vote,
        challenged_vote,
        result_disputed,
        challenger_dispute_ack,
        challenged_dispute_ack,
        result_round,
        challenger_vote_round,
        challenged_vote_round
    `)
        .eq(
            "status",
            "accepted"
        )
        .or(
            `challenger_team_id.eq.${currentTeamId},challenged_team_id.eq.${currentTeamId}`
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


        yourMatches.innerHTML = `

            <p class="message error">
                ${escapeHTML(error.message)}
            </p>

        `;


        return;
    }


    if (
        !matches ||
        matches.length === 0
    ) {

        yourMatches.innerHTML = `

            <p class="no-challenges">
                You do not have any matches yet.
            </p>

        `;


        return;
    }


    yourMatches.innerHTML =
        "";


    // Load every match

    for (
        const match of matches
    ) {

        await createMatchCard(
            match
        );

    }

}


// =========================================================
// CREATE MATCH CARD
// =========================================================

async function createMatchCard(
    match
) {

    const teamOne =
        await getTeam(
            match.challenger_team_id
        );


    const teamTwo =
        await getTeam(
            match.challenged_team_id
        );


    const teamOnePlayers =
        await getPlayers(
            match.challenger_team_id
        );


    const teamTwoPlayers =
        await getPlayers(
            match.challenged_team_id
        );


    const matchCard =
        document.createElement(
            "div"
        );


    matchCard.className =
        "match-card";


    matchCard.innerHTML = `

        <div class="match-teams">


            <!-- TEAM ONE -->

            <div class="match-team">

                <h3>
                    ${escapeHTML(
                        teamOne?.name ||
                        "Unknown Team"
                    )}
                </h3>


                <div class="match-players">

                    ${teamOnePlayers}

                </div>

            </div>



            <!-- VS -->

            <div class="match-vs">
                VS
            </div>



            <!-- TEAM TWO -->

            <div class="match-team">

                <h3>
                    ${escapeHTML(
                        teamTwo?.name ||
                        "Unknown Team"
                    )}
                </h3>


                <div class="match-players">

                    ${teamTwoPlayers}

                </div>

            </div>


        </div>



        <!-- DATE / TIME -->

        <div class="match-information">


            <div>

                <span>
                    Match Date
                </span>

                <strong>
                    ${formatDate(
                        match.match_date
                    )}
                </strong>

            </div>



            <div>

                <span>
                    Match Time
                </span>

                <strong>
                    ${formatDisplayTime(
                        match.match_time
                    )}
                </strong>

            </div>


        </div>



        <!-- CANCEL -->

        <button
        class="danger-button cancel-match-button"
        data-id="${match.id}"
    >
        Cancel Match
    </button>
    
    <div
        class="message cancel-message"
    ></div>
    
    
    <div class="match-result-section">
    
        ${
            match.result_disputed &&
            !(
                (
                    match.challenger_dispute_ack &&
                    currentTeamId ===
                    match.challenger_team_id
                )
                ||
                (
                    match.challenged_dispute_ack &&
                    currentTeamId ===
                    match.challenged_team_id
                )
            )
                ? `
                    <div class="result-dispute">
    
                        <span>
                            Both teams do not agree on the outcome.
                        </span>
    
                        <button
                            class="result-ok-button"
                            data-id="${match.id}"
                        >
                            OK
                        </button>
    
                    </div>
                `
                : `
                    <h3>
                        Who won this match?
                    </h3>
    
                    <div class="winner-buttons">
    
                        <button
                            class="team-one-winner"
                            data-match-id="${match.id}"
                            data-team-id="${match.challenger_team_id}"
                        >
                            ${escapeHTML(
                                teamOne?.name ||
                                "Team 1"
                            )}
                        </button>
    
    
                        <button
                            class="team-two-winner"
                            data-match-id="${match.id}"
                            data-team-id="${match.challenged_team_id}"
                        >
                            ${escapeHTML(
                                teamTwo?.name ||
                                "Team 2"
                            )}
                        </button>
    
                    </div>
                `
        }
    
        <div
            class="message result-message"
        ></div>
    
    </div>
    
    
    <div class="match-result-section">
    
        <h3>
            Who won this match?
        </h3>
    
    
        <div class="winner-buttons">
    
            <button
                class="team-one-winner"
                data-match-id="${match.id}"
                data-team-id="${match.challenger_team_id}"
            >
                ${escapeHTML(
                    teamOne?.name ||
                    "Team 1"
                )}
            </button>
    
    
            <button
                class="team-two-winner"
                data-match-id="${match.id}"
                data-team-id="${match.challenged_team_id}"
            >
                ${escapeHTML(
                    teamTwo?.name ||
                    "Team 2"
                )}
            </button>
    
        </div>
    
    
        <div
            class="result-dispute"
            style="display: none;"
        >
    
            <span>
                Both teams do not agree on the outcome.
            </span>
    
            <button class="result-ok-button">
                OK
            </button>
    
        </div>
    
    
        <div
            class="message result-message"
        ></div>
    
    </div>

    `;

    const winnerButtons =
    matchCard.querySelectorAll(
        ".team-one-winner, .team-two-winner"
    );


const disputeBox =
    matchCard.querySelector(
        ".result-dispute"
    );


const resultOkButton =
    matchCard.querySelector(
        ".result-ok-button"
    );


const resultMessage =
    matchCard.querySelector(
        ".result-message"
    );


winnerButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            async function () {

                const winnerTeamId =
                    button.dataset.teamId;


                winnerButtons.forEach(
                    btn => {

                        btn.disabled = true;

                    }
                );


                button.textContent =
                    "Submitting...";


                const {
                    data,
                    error
                } = await db.rpc(
                    "submit_match_vote",
                    {
                        p_challenge_id:
                            match.id,

                        p_winner_team_id:
                            winnerTeamId
                    }
                );


                if (error) {

                    console.error(error);


                    winnerButtons.forEach(
                        btn => {

                            btn.disabled = false;

                        }
                    );


                    button.textContent =
                        button.dataset.teamId ===
                        match.challenger_team_id
                            ? teamOne.name
                            : teamTwo.name;


                    resultMessage.textContent =
                        error.message;


                    resultMessage.className =
                        "message error";


                    return;
                }


                // Both teams disagreed

                if (data === "disputed") {

                    winnerButtons.forEach(
                        btn => {

                            btn.style.display =
                                "none";

                        }
                    );


                    disputeBox.style.display =
                        "flex";


                    return;
                }


                // Waiting for the other team

                if (data === "waiting") {

                    resultMessage.textContent =
                        "Your vote has been recorded. Waiting for the other team.";


                    resultMessage.className =
                        "message success";


                    return;
                }


                // Match completed

                if (data === "completed") {

                    await loadYourMatches();

                }

            }
        );

    }
);


// =====================================================
// DISPUTE OK BUTTON
// =====================================================

resultOkButton.addEventListener(
    "click",
    function () {

        disputeBox.style.display =
            "none";


        winnerButtons.forEach(
            button => {

                button.style.display =
                    "block";

                button.disabled =
                    false;

            }
        );


        resultMessage.textContent =
            "";

        resultMessage.className =
            "message";

    }
);
    yourMatches.appendChild(
        matchCard
    );


    const cancelButton =
        matchCard.querySelector(
            ".cancel-match-button"
        );


    const cancelMessage =
        matchCard.querySelector(
            ".cancel-message"
        );


    cancelButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Are you sure you want to cancel this match?"
                );


            if (!confirmed) {
                return;
            }


            cancelButton.disabled =
                true;


            cancelButton.textContent =
                "Cancelling...";


            const {
                error
            } = await db.rpc(
                "cancel_match",
                {
                    challenge_id:
                        match.id
                }
            );


            if (error) {

                console.error(error);


                cancelButton.disabled =
                    false;


                cancelButton.textContent =
                    "Cancel Match";


                cancelMessage.textContent =
                    error.message;


                cancelMessage.className =
                    "message error";


                return;
            }


            await loadYourMatches();

        }
    );

}

// =========================================================
// MATCH RESULT VOTING
// =========================================================

const winnerButtons =
    matchCard.querySelectorAll(
        ".team-one-winner, .team-two-winner"
    );


const resultOkButton =
    matchCard.querySelector(
        ".result-ok-button"
    );


// =========================================================
// WINNER BUTTONS
// =========================================================

winnerButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            async function () {

                const winnerTeamId =
                    button.dataset.teamId;


                /*
                   Prevent double clicking.
                */

                winnerButtons.forEach(
                    btn => {
                        btn.disabled = true;
                    }
                );


                const {
                    data,
                    error
                } = await db.rpc(
                    "submit_match_vote",
                    {
                        p_challenge_id:
                            match.id,

                        p_winner_team_id:
                            winnerTeamId
                    }
                );


                if (error) {

                    console.error(error);

                    alert(
                        error.message
                    );


                    winnerButtons.forEach(
                        btn => {
                            btn.disabled = false;
                        }
                    );


                    return;
                }


                /*
                   Both teams agreed.
                */

                if (
                    data ===
                    "completed"
                ) {

                    await loadYourMatches();

                    return;

                }


                /*
                   Teams disagreed.
                   Reload the match so the
                   orange message appears.
                */

                if (
                    data ===
                    "disputed"
                ) {

                    await loadYourMatches();

                    return;

                }


                /*
                   Only this team has voted.
                   Keep their buttons disabled.
                */

                if (
                    data ===
                    "waiting"
                ) {

                    button.disabled =
                        true;

                }

            }
        );

    }
);


// =========================================================
// OK BUTTON
// =========================================================

if (resultOkButton) {

    resultOkButton.addEventListener(
        "click",
        async function () {

            resultOkButton.disabled =
                true;


            resultOkButton.textContent =
                "OK...";


            const {
                data,
                error
            } = await db.rpc(
                "acknowledge_match_dispute",
                {
                    p_challenge_id:
                        match.id
                }
            );


            if (error) {

                console.error(error);

                alert(
                    error.message
                );


                resultOkButton.disabled =
                    false;


                resultOkButton.textContent =
                    "OK";


                return;

            }


            /*
               Immediately reload this team's
               match card.

               The team's own vote was cleared,
               so they can vote immediately.

               We do NOT wait for the other team.
            */

            await loadYourMatches();

        }
    );

}

// =========================================================
// GET TEAM
// =========================================================

async function getTeam(
    teamId
) {

    const {
        data: team,
        error
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


    if (error) {

        console.error(error);

        return null;
    }


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

async function getPlayers(
    teamId
) {

    const {
        data: members,
        error
    } = await db
        .from("team_members")
        .select(
            "user_id"
        )
        .eq(
            "team_id",
            teamId
        );


    if (error) {

        console.error(error);

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


    const userIds =
        members.map(
            member =>
                member.user_id
        );


    const {
        data: profiles,
        error: profileError
    } = await db
        .from("profiles")
        .select(
            "id, firstname"
        )
        .in(
            "id",
            userIds
        );


    if (profileError) {

        console.error(
            profileError
        );

        return `
            <p>
                Unable to load players
            </p>
        `;

    }


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

                    ${escapeHTML(
                        profile.firstname ||
                        "Unknown"
                    )}

                </div>

            `
        )
        .join("");

}


// =========================================================
// FORMAT DATE
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
// FORMAT TIME
// =========================================================

function formatDisplayTime(
    timeString
) {

    const parts =
        timeString.split(":");


    const hour =
        Number(
            parts[0]
        );


    const minute =
        Number(
            parts[1]
        );


    return formatTime(
        hour,
        minute
    );

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


    if (
        displayHour === 0
    ) {

        displayHour =
            12;

    }


    return (
        `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`
    );

}


// =========================================================
// ESCAPE HTML
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

if (logoutButton) {
        logoutButton.addEventListener(
        "click",
        async function () {

            await db.auth.signOut();

            window.location.href =
                "index.html";

        }
    );
}


// =========================================================
// START
// =========================================================

loadChallengesPage();