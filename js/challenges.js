// =========================================================
// ANNSBOROUGH PARK PICKLEBALL TOURNAMENT
// CHALLENGES PAGE
// =========================================================
//
// This file works with the existing Supabase database:
//
// tables:
//   teams
//   team_members
//   profiles
//   challenges
//
// RPCs:
//   get_user_team_id
//   create_challenge
//   accept_challenge
//   decline_challenge
//   cancel_match
//   submit_match_vote
//   acknowledge_match_dispute
//
// =========================================================


// =========================================================
// DOM ELEMENTS
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
// GLOBAL STATE
// =========================================================

let currentUser = null;
let currentTeamId = null;


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================================================
// SHOW MESSAGE
// =========================================================

function showMessage(element, message, type = "") {

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        type
            ? `message ${type}`
            : "message";

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        undefined,
        {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


// =========================================================
// FORMAT TIME
// =========================================================

function formatDisplayTime(value) {

    if (!value) {
        return "";
    }

    const parts =
        String(value).split(":");

    if (parts.length < 2) {
        return value;
    }

    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return value;
    }

    const date =
        new Date();

    date.setHours(
        hours,
        minutes,
        0,
        0
    );

    return date.toLocaleTimeString(
        undefined,
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


// =========================================================
// GET USER
// =========================================================

async function getCurrentUser() {

    const {
        data,
        error
    } = await db.auth.getUser();

    if (error) {
        throw error;
    }

    if (!data || !data.user) {
        return null;
    }

    return data.user;

}


// =========================================================
// GET CURRENT TEAM
// =========================================================
//
// Uses your existing RPC:
//
// get_user_team_id()
// =========================================================

async function getCurrentTeamId() {

    const {
        data,
        error
    } = await db.rpc(
        "get_user_team_id"
    );

    if (error) {
        throw error;
    }

    return data;

}


// =========================================================
// GET TEAM
// =========================================================

async function getTeam(teamId) {

    if (!teamId) {
        return null;
    }

    const {
        data,
        error
    } = await db
        .from("teams")
        .select(
            "id, name, code, total_points, created_at"
        )
        .eq("id", teamId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;

}


// =========================================================
// GET PLAYERS
// =========================================================

async function getPlayers(teamId) {

    if (!teamId) {
        return "";
    }

    const {
        data: members,
        error: membersError
    } = await db
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

    if (membersError) {
        throw membersError;
    }

    if (!members || members.length === 0) {
        return "<span>No players listed</span>";
    }

    const userIds =
        members.map(
            member => member.user_id
        );

    const {
        data: profiles,
        error: profilesError
    } = await db
        .from("profiles")
        .select("id, firstname")
        .in("id", userIds);

    if (profilesError) {
        throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
        return "<span>No players listed</span>";
    }

    return profiles
        .map(
            profile =>
                `<div class="player-name">${escapeHTML(profile.firstname)}</div>`
        )
        .join("");

}


// =========================================================
// LOAD AVAILABLE TEAMS
// =========================================================
//
// Gets all teams except the user's own team.
// =========================================================

async function loadTeams() {

    if (!teamSelect) {
        return;
    }

    teamSelect.innerHTML =
        `<option value="">Loading teams...</option>`;

    try {

        const {
            data,
            error
        } = await db
            .from("teams")
            .select(
                "id, name"
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );

        if (error) {
            throw error;
        }

        teamSelect.innerHTML =
            `<option value="">Choose a team...</option>`;

        const teams =
            (data || [])
                .filter(
                    team =>
                        String(team.id) !==
                        String(currentTeamId)
                );

        if (teams.length === 0) {

            teamSelect.innerHTML =
                `<option value="">
                    No other teams available
                </option>`;

            return;
        }

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

    } catch (error) {

        console.error(
            "LOAD TEAMS ERROR:",
            error
        );

        teamSelect.innerHTML =
            `<option value="">
                Unable to load teams
            </option>`;

        showMessage(
            challengeMessage,
            error.message ||
                "Unable to load teams.",
            "error"
        );

    }

}


// =========================================================
// CREATE TIME OPTIONS
// =========================================================
//
// Your SQL requires 30-minute intervals.
// We therefore generate only :00 and :30.
//
// Change START_HOUR / END_HOUR if your tournament
// uses a different operating schedule.
// =========================================================

function loadTimeOptions() {

    if (!matchTime) {
        return;
    }

    matchTime.innerHTML =
        `<option value="">Select a time</option>`;

    const START_HOUR = 7;
    const END_HOUR = 21;

    for (
        let hour = START_HOUR;
        hour <= END_HOUR;
        hour++
    ) {

        for (
            let minute of [0, 30]
        ) {

            if (
                hour === END_HOUR &&
                minute > 0
            ) {
                continue;
            }

            const hourString =
                String(hour)
                    .padStart(2, "0");

            const minuteString =
                String(minute)
                    .padStart(2, "0");

            const value =
                `${hourString}:${minuteString}`;

            const option =
                document.createElement("option");

            option.value =
                value;

            option.textContent =
                formatDisplayTime(value);

            matchTime.appendChild(
                option
            );

        }

    }

}


// =========================================================
// SET MINIMUM DATE
// =========================================================

function setMinimumDate() {

    if (!matchDate) {
        return;
    }

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

}


// =========================================================
// LOAD INCOMING CHALLENGES
// =========================================================

async function loadIncomingChallenges() {

    if (!incomingChallenges) {
        return;
    }

    incomingChallenges.innerHTML =
        `<p class="loading-text">
            Loading challenges...
        </p>`;

    if (!currentTeamId) {

        incomingChallenges.innerHTML =
            `<div class="message">
                You need to be on a team to receive challenges.
            </div>`;

        return;
    }

    try {

        const {
            data,
            error
        } = await db
            .from("challenges")
            .select(
                `
                id,
                challenger_team_id,
                challenged_team_id,
                match_date,
                match_time,
                status,
                created_at
                `
            )
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
            throw error;
        }

        if (!data || data.length === 0) {

            incomingChallenges.innerHTML =
                `<p>
                    No incoming challenges.
                </p>`;

            return;
        }

        incomingChallenges.innerHTML = "";

        for (
            const challenge of data
        ) {

            const card =
                await createIncomingChallengeCard(
                    challenge
                );

            incomingChallenges.appendChild(
                card
            );

        }

    } catch (error) {

        console.error(
            "LOAD INCOMING CHALLENGES ERROR:",
            error
        );

        incomingChallenges.innerHTML =
            `
            <div class="message error">
                Unable to load incoming challenges:
                ${escapeHTML(error.message)}
            </div>
            `;

    }

}


// =========================================================
// CREATE INCOMING CHALLENGE CARD
// =========================================================

async function createIncomingChallengeCard(
    challenge
) {

    const card =
        document.createElement("div");

    card.className =
        "challenge-card";

    let challengerTeam = null;

    try {

        challengerTeam =
            await getTeam(
                challenge.challenger_team_id
            );

    } catch (error) {

        console.error(
            "LOAD CHALLENGER TEAM ERROR:",
            error
        );

    }

    const teamName =
        challengerTeam?.name ||
        "Unknown Team";

    card.innerHTML = `

        <div class="challenge-card-content">

            <h3>
                ${escapeHTML(teamName)}
            </h3>

            <p>
                <strong>Date:</strong>
                ${escapeHTML(
                    formatDate(
                        challenge.match_date
                    )
                )}
            </p>

            <p>
                <strong>Time:</strong>
                ${escapeHTML(
                    formatDisplayTime(
                        challenge.match_time
                    )
                )}
            </p>

            <div class="challenge-actions">

                <button
                    type="button"
                    class="accept-challenge-button"
                >
                    Accept
                </button>

                <button
                    type="button"
                    class="danger-button decline-challenge-button"
                >
                    Decline
                </button>

            </div>

            <div class="message challenge-action-message"></div>

        </div>

    `;

    const acceptButton =
        card.querySelector(
            ".accept-challenge-button"
        );

    const declineButton =
        card.querySelector(
            ".decline-challenge-button"
        );

    const actionMessage =
        card.querySelector(
            ".challenge-action-message"
        );


    // =====================================================
    // ACCEPT
    // =====================================================

    acceptButton.addEventListener(
        "click",
        async function () {

            acceptButton.disabled = true;
            declineButton.disabled = true;

            acceptButton.textContent =
                "Accepting...";

            try {

                const {
                    error
                } = await db.rpc(
                    "accept_challenge",
                    {
                        challenge_id:
                            challenge.id
                    }
                );

                if (error) {
                    throw error;
                }

                showMessage(
                    actionMessage,
                    "Challenge accepted!",
                    "success"
                );

                await loadIncomingChallenges();
                await loadYourMatches();

            } catch (error) {

                console.error(
                    "ACCEPT CHALLENGE ERROR:",
                    error
                );

                acceptButton.disabled =
                    false;

                declineButton.disabled =
                    false;

                acceptButton.textContent =
                    "Accept";

                showMessage(
                    actionMessage,
                    error.message ||
                        "Unable to accept challenge.",
                    "error"
                );

            }

        }
    );


    // =====================================================
    // DECLINE
    // =====================================================

    declineButton.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Are you sure you want to decline this challenge?"
                );

            if (!confirmed) {
                return;
            }

            acceptButton.disabled =
                true;

            declineButton.disabled =
                true;

            declineButton.textContent =
                "Declining...";

            try {

                const {
                    error
                } = await db.rpc(
                    "decline_challenge",
                    {
                        challenge_id:
                            challenge.id
                    }
                );

                if (error) {
                    throw error;
                }

                showMessage(
                    actionMessage,
                    "Challenge declined.",
                    "success"
                );

                await loadIncomingChallenges();

            } catch (error) {

                console.error(
                    "DECLINE CHALLENGE ERROR:",
                    error
                );

                acceptButton.disabled =
                    false;

                declineButton.disabled =
                    false;

                declineButton.textContent =
                    "Decline";

                showMessage(
                    actionMessage,
                    error.message ||
                        "Unable to decline challenge.",
                    "error"
                );

            }

        }
    );


    return card;

}


// =========================================================
// LOAD YOUR MATCHES
// =========================================================

async function loadYourMatches() {

    if (!yourMatches) {
        return;
    }

    yourMatches.innerHTML =
        `<p class="loading-text">
            Loading matches...
        </p>`;

    if (!currentTeamId) {

        yourMatches.innerHTML =
            `<p>
                You are not currently on a team.
            </p>`;

        return;
    }

    try {

        const {
            data,
            error
        } = await db
            .from("challenges")
            .select(
                `
                id,
                challenger_team_id,
                challenged_team_id,
                match_date,
                match_time,
                status,
                created_by,
                created_at,
                updated_at,
                challenger_vote,
                challenged_vote,
                result_disputed,
                challenger_dispute_ack,
                challenged_dispute_ack,
                result_round,
                challenger_vote_round,
                challenged_vote_round
                `
            )
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
            throw error;
        }

        if (!data || data.length === 0) {

            yourMatches.innerHTML =
                `<p>
                    No matches scheduled yet.
                </p>`;

            return;
        }

        yourMatches.innerHTML = "";

        for (
            const match of data
        ) {

            await createMatchCard(
                match
            );

        }

    } catch (error) {

        console.error(
            "LOAD YOUR MATCHES ERROR:",
            error
        );

        yourMatches.innerHTML =
            `
            <div class="message error">
                Unable to load your matches:
                ${escapeHTML(error.message)}
            </div>
            `;

    }

}


// =========================================================
// CREATE MATCH CARD
// =========================================================

async function createMatchCard(match) {

    if (!match || !match.id) {
        return;
    }

    const matchCard =
        document.createElement("div");

    matchCard.className =
        "match-card";

    let teamOne = null;
    let teamTwo = null;
    let teamOnePlayers = "";
    let teamTwoPlayers = "";

    try {

        [
            teamOne,
            teamTwo,
            teamOnePlayers,
            teamTwoPlayers
        ] = await Promise.all([

            getTeam(
                match.challenger_team_id
            ),

            getTeam(
                match.challenged_team_id
            ),

            getPlayers(
                match.challenger_team_id
            ),

            getPlayers(
                match.challenged_team_id
            )

        ]);

    } catch (error) {

        console.error(
            "LOAD MATCH DETAILS ERROR:",
            error
        );

        teamOnePlayers =
            `<div class="message error">
                Unable to load players.
            </div>`;

        teamTwoPlayers =
            `<div class="message error">
                Unable to load players.
            </div>`;

    }


    const isTeamOne =
        String(currentTeamId) ===
        String(match.challenger_team_id);

    const isTeamTwo =
        String(currentTeamId) ===
        String(match.challenged_team_id);

    const validCurrentTeam =
        isTeamOne ||
        isTeamTwo;


    // =====================================================
    // DETERMINE WHETHER THIS TEAM ALREADY VOTED
    // =====================================================

    const currentTeamAlreadyVoted =
        (
            isTeamOne &&
            match.challenger_vote &&
            Number(match.challenger_vote_round) ===
                Number(match.result_round)
        )
        ||
        (
            isTeamTwo &&
            match.challenged_vote &&
            Number(match.challenged_vote_round) ===
                Number(match.result_round)
        );


    // =====================================================
    // RESULT UI
    // =====================================================

    let resultHTML = "";


    if (match.result_disputed) {

        const alreadyAcknowledged =
            (
                isTeamOne &&
                Boolean(
                    match.challenger_dispute_ack
                )
            )
            ||
            (
                isTeamTwo &&
                Boolean(
                    match.challenged_dispute_ack
                )
            );


        if (alreadyAcknowledged) {

            resultHTML = `

                <div class="match-result-section">

                    <div class="message success">

                        You acknowledged the dispute.

                        <br>

                        Waiting for the other team to acknowledge it.

                    </div>

                </div>

            `;

        } else {

            resultHTML = `

                <div class="match-result-section">

                    <div class="result-dispute">

                        <span>
                            The teams reported different winners.
                            Please acknowledge this dispute.
                        </span>

                        <button
                            type="button"
                            class="result-ok-button"
                        >
                            OK
                        </button>

                    </div>

                    <div class="message dispute-message"></div>

                </div>

            `;

        }

    } else if (
        validCurrentTeam &&
        !currentTeamAlreadyVoted
    ) {

        resultHTML = `

            <div class="match-result-section">

                <h3>
                    Who won this match?
                </h3>

                <div class="winner-buttons">

                    <button
                        type="button"
                        class="team-one-winner"
                        data-team-id="${escapeHTML(
                            match.challenger_team_id
                        )}"
                    >
                        ${escapeHTML(
                            teamOne?.name ||
                            "Team 1"
                        )}
                    </button>

                    <button
                        type="button"
                        class="team-two-winner"
                        data-team-id="${escapeHTML(
                            match.challenged_team_id
                        )}"
                    >
                        ${escapeHTML(
                            teamTwo?.name ||
                            "Team 2"
                        )}
                    </button>

                </div>

                <div class="message result-message"></div>

            </div>

        `;

    } else if (
        validCurrentTeam &&
        currentTeamAlreadyVoted
    ) {

        resultHTML = `

            <div class="match-result-section">

                <div class="message success">

                    Your vote has been recorded.

                    <br>

                    Waiting for the other team.

                </div>

            </div>

        `;

    } else {

        resultHTML = `

            <div class="match-result-section">

                <div class="message error">
                    Your team could not be verified for this match.
                </div>

            </div>

        `;

    }


    // =====================================================
    // MATCH CARD HTML
    // =====================================================

    matchCard.innerHTML = `

        <div class="match-teams">

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

            <div class="match-vs">
                VS
            </div>

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


        <div class="match-information">

            <div>

                <span>
                    Match Date
                </span>

                <strong>
                    ${escapeHTML(
                        formatDate(
                            match.match_date
                        )
                    )}
                </strong>

            </div>

            <div>

                <span>
                    Match Time
                </span>

                <strong>
                    ${escapeHTML(
                        formatDisplayTime(
                            match.match_time
                        )
                    )}
                </strong>

            </div>

        </div>


        <button
            type="button"
            class="danger-button cancel-match-button"
        >
            Cancel Match
        </button>

        <div class="message cancel-message"></div>


        ${resultHTML}

    `;


    yourMatches.appendChild(
        matchCard
    );


    // =====================================================
    // CANCEL MATCH
    // =====================================================

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

            try {

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
                    throw error;
                }

                await loadYourMatches();

            } catch (error) {

                console.error(
                    "CANCEL MATCH ERROR:",
                    error
                );

                cancelButton.disabled =
                    false;

                cancelButton.textContent =
                    "Cancel Match";

                showMessage(
                    cancelMessage,
                    error.message ||
                        "Unable to cancel match.",
                    "error"
                );

            }

        }
    );


    // =====================================================
    // WINNER BUTTONS
    // =====================================================

    const winnerButtons =
        matchCard.querySelectorAll(
            ".team-one-winner, .team-two-winner"
        );


    winnerButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                async function () {

                    winnerButtons.forEach(
                        btn => {
                            btn.disabled = true;
                        }
                    );

                    const winnerTeamId =
                        button.dataset.teamId;

                    const originalText =
                        button.textContent.trim();

                    button.textContent =
                        "Submitting...";

                    const resultMessage =
                        matchCard.querySelector(
                            ".result-message"
                        );

                    try {

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
                            throw error;
                        }


                        console.log(
                            "submit_match_vote result:",
                            data
                        );


                        if (
                            data === "completed"
                        ) {

                            await loadYourMatches();

                            return;
                        }


                        if (
                            data === "disputed"
                        ) {

                            await loadYourMatches();

                            return;
                        }


                        if (
                            data === "waiting"
                        ) {

                            showMessage(
                                resultMessage,
                                "Your vote has been recorded. Waiting for the other team.",
                                "success"
                            );

                            return;
                        }


                        showMessage(
                            resultMessage,
                            "Unexpected response from the server. Please refresh the page.",
                            "error"
                        );

                    } catch (error) {

                        console.error(
                            "SUBMIT MATCH VOTE ERROR:",
                            error
                        );

                        winnerButtons.forEach(
                            btn => {
                                btn.disabled = false;
                            }
                        );

                        button.textContent =
                            originalText;

                        showMessage(
                            resultMessage,
                            error.message ||
                                "Unable to submit your vote.",
                            "error"
                        );

                    }

                }
            );

        }
    );


    // =====================================================
    // DISPUTE OK BUTTON
    // =====================================================

    const resultOkButton =
        matchCard.querySelector(
            ".result-ok-button"
        );


    if (resultOkButton) {

        resultOkButton.addEventListener(
            "click",
            async function () {

                resultOkButton.disabled =
                    true;

                resultOkButton.textContent =
                    "Processing...";

                const disputeMessage =
                    matchCard.querySelector(
                        ".dispute-message"
                    );

                try {

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
                        throw error;
                    }

                    console.log(
                        "acknowledge_match_dispute result:",
                        data
                    );

                    await loadYourMatches();

                } catch (error) {

                    console.error(
                        "ACKNOWLEDGE DISPUTE ERROR:",
                        error
                    );

                    resultOkButton.disabled =
                        false;

                    resultOkButton.textContent =
                        "OK";

                    showMessage(
                        disputeMessage,
                        error.message ||
                            "Unable to acknowledge dispute.",
                        "error"
                    );

                }

            }
        );

    }

}


// =========================================================
// SEND CHALLENGE
// =========================================================
//
// Your SQL function:
//
// create_challenge(
//     target_team_id,
//     selected_date,
//     selected_time
// )
// =========================================================

if (challengeForm) {

    challengeForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const targetTeamId =
                teamSelect?.value;

            const selectedDate =
                matchDate?.value;

            const selectedTime =
                matchTime?.value;


            if (!targetTeamId) {

                showMessage(
                    challengeMessage,
                    "Please choose a team.",
                    "error"
                );

                return;
            }


            if (!selectedDate) {

                showMessage(
                    challengeMessage,
                    "Please choose a date.",
                    "error"
                );

                return;
            }


            if (!selectedTime) {

                showMessage(
                    challengeMessage,
                    "Please choose a time.",
                    "error"
                );

                return;
            }


            const submitButton =
                challengeForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Sending...";

            }


            showMessage(
                challengeMessage,
                "Sending challenge..."
            );


            try {

                const {
                    data,
                    error
                } = await db.rpc(
                    "create_challenge",
                    {
                        target_team_id:
                            targetTeamId,

                        selected_date:
                            selectedDate,

                        selected_time:
                            selectedTime
                    }
                );


                if (error) {
                    throw error;
                }


                console.log(
                    "Challenge created:",
                    data
                );


                showMessage(
                    challengeMessage,
                    "Challenge sent successfully!",
                    "success"
                );


                challengeForm.reset();


                loadTimeOptions();


                await loadIncomingChallenges();
                await loadYourMatches();

            } catch (error) {

                console.error(
                    "CREATE CHALLENGE ERROR:",
                    error
                );

                showMessage(
                    challengeMessage,
                    error.message ||
                        "Unable to send challenge.",
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Send Challenge";

                }

            }

        }
    );

}


// =========================================================
// LOGOUT
// =========================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function() {

            await db.auth.signOut();

            window.location.href =
                "index.html";

        }
    );

}


// =========================================================
// INITIALIZE PAGE
// =========================================================

async function initializeChallengesPage() {

    console.log(
        "======================================"
    );

    console.log(
        "Initializing Challenges page..."
    );

    console.log(
        "======================================"
    );


    try {

        // -------------------------------------------------
        // 1. CHECK SUPABASE
        // -------------------------------------------------

        if (
            typeof db === "undefined" ||
            !db
        ) {

            throw new Error(
                "Supabase database client was not initialized. Check js/supabase.js."
            );

        }


        // -------------------------------------------------
        // 2. CHECK LOGIN
        // -------------------------------------------------

        currentUser =
            await getCurrentUser();


        if (!currentUser) {

            window.location.href =
                "login.html";

            return;

        }


        console.log(
            "Logged in user:",
            currentUser.id
        );


        // -------------------------------------------------
        // 3. GET TEAM
        // -------------------------------------------------

        currentTeamId =
            await getCurrentTeamId();


        console.log(
            "Current team:",
            currentTeamId
        );


        // -------------------------------------------------
        // 4. BASIC PAGE SETUP
        // -------------------------------------------------

        loadTimeOptions();

        setMinimumDate();


        // -------------------------------------------------
        // 5. NO TEAM
        // -------------------------------------------------

        if (!currentTeamId) {

            if (teamSelect) {

                teamSelect.innerHTML =
                    `<option value="">
                        Join or create a team first
                    </option>`;

                teamSelect.disabled =
                    true;

            }

            if (challengeForm) {

                const submitButton =
                    challengeForm.querySelector(
                        'button[type="submit"]'
                    );

                if (submitButton) {
                    submitButton.disabled =
                        true;
                }

            }

            if (incomingChallenges) {

                incomingChallenges.innerHTML =
                    `<p>
                        You need to be on a team to receive challenges.
                    </p>`;

            }

            if (yourMatches) {

                yourMatches.innerHTML =
                    `<p>
                        You are not currently on a team.
                    </p>`;

            }

            return;

        }


        // -------------------------------------------------
        // 6. LOAD ALL PAGE DATA
        // -------------------------------------------------

        await Promise.all([
            loadTeams(),
            loadIncomingChallenges(),
            loadYourMatches()
        ]);


        console.log(
            "Challenges page loaded successfully."
        );


    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "CHALLENGES PAGE INITIALIZATION ERROR:",
            error
        );

        console.error(
            "======================================"
        );


        if (teamSelect) {

            teamSelect.innerHTML =
                `<option value="">
                    Unable to load teams
                </option>`;

        }

        if (incomingChallenges) {

            incomingChallenges.innerHTML =
                `
                <div class="message error">

                    Unable to load challenges.

                    <br><br>

                    ${escapeHTML(
                        error.message ||
                        "Unknown error"
                    )}

                </div>
                `;

        }

        if (yourMatches) {

            yourMatches.innerHTML =
                `
                <div class="message error">

                    Unable to load matches.

                    <br><br>

                    ${escapeHTML(
                        error.message ||
                        "Unknown error"
                    )}

                </div>
                `;

        }

    }

}


// =========================================================
// START
// =========================================================

initializeChallengesPage();