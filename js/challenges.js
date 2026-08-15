// =========================================================
// CREATE MATCH CARD
// =========================================================

async function createMatchCard(match) {

    if (!match || !match.id) {
        console.error(
            "CREATE MATCH CARD ERROR: Invalid match object",
            match
        );

        return;
    }


    // =====================================================
    // LOAD TEAM / PLAYER DATA SAFELY
    // =====================================================

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
            getTeam(match.challenger_team_id),
            getTeam(match.challenged_team_id),
            getPlayers(match.challenger_team_id),
            getPlayers(match.challenged_team_id)
        ]);

    } catch (error) {

        console.error(
            "ERROR LOADING MATCH DATA:",
            error
        );

        teamOnePlayers =
            '<div class="message error">Unable to load team players.</div>';

        teamTwoPlayers =
            '<div class="message error">Unable to load team players.</div>';
    }


    // =====================================================
    // CREATE MATCH CARD
    // =====================================================

    const matchCard =
        document.createElement("div");

    matchCard.className =
        "match-card";


    // =====================================================
    // DETERMINE THIS TEAM
    // =====================================================

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
    // DETERMINE DISPUTE ACKNOWLEDGEMENT
    // =====================================================

    const alreadyAcknowledged =
        (
            isTeamOne &&
            Boolean(match.challenger_dispute_ack)
        )
        ||
        (
            isTeamTwo &&
            Boolean(match.challenged_dispute_ack)
        );


    // =====================================================
    // RESULT SECTION
    // =====================================================

    let resultHTML = "";


    if (match.result_disputed) {

        // -------------------------------------------------
        // DISPUTED MATCH
        // -------------------------------------------------

        if (!alreadyAcknowledged) {

            resultHTML = `

                <div class="match-result-section">

                    <div class="result-dispute">

                        <span>
                            Both teams do not agree on the outcome.
                        </span>

                        <button
                            type="button"
                            class="result-ok-button"
                            data-id="${escapeHTML(match.id)}"
                        >
                            OK
                        </button>

                    </div>

                </div>

            `;

        } else {

            // The current team has already acknowledged.
            // Do not immediately show the voting controls again.

            resultHTML = `

                <div class="match-result-section">

                    <div class="message success">
                        Dispute acknowledged. Waiting for the match status to update.
                    </div>

                </div>

            `;

        }

    } else if (validCurrentTeam) {

        // -------------------------------------------------
        // NORMAL VOTING
        // -------------------------------------------------

        resultHTML = `

            <div class="match-result-section">

                <h3>
                    Who won this match?
                </h3>


                <div class="winner-buttons">

                    <button
                        type="button"
                        class="team-one-winner"
                        data-match-id="${escapeHTML(match.id)}"
                        data-team-id="${escapeHTML(match.challenger_team_id)}"
                    >
                        ${escapeHTML(
                            teamOne?.name ||
                            "Team 1"
                        )}
                    </button>


                    <button
                        type="button"
                        class="team-two-winner"
                        data-match-id="${escapeHTML(match.id)}"
                        data-team-id="${escapeHTML(match.challenged_team_id)}"
                    >
                        ${escapeHTML(
                            teamTwo?.name ||
                            "Team 2"
                        )}
                    </button>

                </div>


                <div
                    class="message result-message"
                ></div>

            </div>

        `;

    } else {

        // -------------------------------------------------
        // INVALID TEAM STATE
        // -------------------------------------------------

        resultHTML = `

            <div class="match-result-section">

                <div class="message error">
                    Your team could not be verified for this match.
                </div>

            </div>

        `;

    }


    // =====================================================
    // DETERMINE WHETHER MATCH CAN BE CANCELLED
    // =====================================================

    const matchIsInResultState =
        Boolean(match.result_disputed);


    const showCancelButton =
        !matchIsInResultState;


    // =====================================================
    // CANCEL BUTTON HTML
    // =====================================================

    const cancelButtonHTML =
        showCancelButton
            ? `

                <button
                    type="button"
                    class="danger-button cancel-match-button"
                    data-id="${escapeHTML(match.id)}"
                >
                    Cancel Match
                </button>

                <div class="message cancel-message"></div>

              `
            : "";


    // =====================================================
    // COMPLETE MATCH CARD
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


        ${cancelButtonHTML}


        ${resultHTML}

    `;


    // =====================================================
    // ADD CARD TO PAGE
    // =====================================================

    if (!yourMatches) {

        console.error(
            "CREATE MATCH CARD ERROR: #your-matches container not available."
        );

        return;
    }


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


    if (cancelButton) {

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


                    if (cancelMessage) {

                        cancelMessage.textContent =
                            error.message ||
                            "Unable to cancel this match.";

                        cancelMessage.className =
                            "message error";

                    }

                }

            }
        );

    }


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

                    // -----------------------------------------
                    // PREVENT DOUBLE SUBMISSION
                    // -----------------------------------------

                    if (
                        Array.from(
                            winnerButtons
                        ).some(
                            btn => btn.disabled
                        )
                    ) {

                        return;

                    }


                    const winnerTeamId =
                        button.dataset.teamId;


                    if (!winnerTeamId) {

                        console.error(
                            "WINNER VOTE ERROR: Missing team ID."
                        );

                        return;
                    }


                    // -----------------------------------------
                    // DISABLE BOTH BUTTONS
                    // -----------------------------------------

                    winnerButtons.forEach(
                        btn => {
                            btn.disabled = true;
                        }
                    );


                    const originalButtonText =
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


                        // -------------------------------------
                        // BOTH TEAMS AGREED
                        // -------------------------------------

                        if (data === "completed") {

                            await loadYourMatches();

                            return;
                        }


                        // -------------------------------------
                        // TEAMS DISAGREED
                        // -------------------------------------

                        if (data === "disputed") {

                            await loadYourMatches();

                            return;
                        }


                        // -------------------------------------
                        // ONLY ONE TEAM HAS VOTED
                        // -------------------------------------

                        if (data === "waiting") {

                            if (resultMessage) {

                                resultMessage.textContent =
                                    "Your vote has been recorded. Waiting for the other team.";

                                resultMessage.className =
                                    "message success";

                            }


                            // Keep buttons disabled because this
                            // team has already submitted its vote.

                            return;
                        }


                        // -------------------------------------
                        // UNEXPECTED RPC RESULT
                        // -------------------------------------

                        console.warn(
                            "Unexpected submit_match_vote response:",
                            data
                        );


                        if (resultMessage) {

                            resultMessage.textContent =
                                "Your vote could not be confirmed. Please try again.";

                            resultMessage.className =
                                "message error";

                        }


                        winnerButtons.forEach(
                            btn => {
                                btn.disabled = false;
                            }
                        );


                        button.textContent =
                            originalButtonText;

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
                            originalButtonText;


                        if (resultMessage) {

                            resultMessage.textContent =
                                error.message ||
                                "Unable to submit your vote.";

                            resultMessage.className =
                                "message error";

                        }

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
                    "OK...";


                try {

                    const {
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


                    alert(
                        error.message ||
                        "Unable to acknowledge the dispute."
                    );

                }

            }
        );

    }

}