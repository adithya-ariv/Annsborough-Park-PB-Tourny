// =========================================================
// CREATE MATCH CARD
// =========================================================

async function createMatchCard(match) {

    const teamOne =
        await getTeam(match.challenger_team_id);

    const teamTwo =
        await getTeam(match.challenged_team_id);

    const teamOnePlayers =
        await getPlayers(match.challenger_team_id);

    const teamTwoPlayers =
        await getPlayers(match.challenged_team_id);


    const matchCard =
        document.createElement("div");

    matchCard.className =
        "match-card";


    // =====================================================
    // DETERMINE THIS TEAM'S DISPUTE ACKNOWLEDGEMENT
    // =====================================================

    const isTeamOne =
        currentTeamId === match.challenger_team_id;

    const isTeamTwo =
        currentTeamId === match.challenged_team_id;


    const alreadyAcknowledged =
        (
            isTeamOne &&
            match.challenger_dispute_ack
        )
        ||
        (
            isTeamTwo &&
            match.challenged_dispute_ack
        );


    // =====================================================
    // RESULT SECTION
    // =====================================================

    let resultHTML = "";


    if (
        match.result_disputed &&
        !alreadyAcknowledged
    ) {

        // ---------------------------------------------
        // DISAGREEMENT POPUP
        // ---------------------------------------------

        resultHTML = `

            <div class="match-result-section">

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

            </div>

        `;

    } else {

        // ---------------------------------------------
        // VOTING SECTION
        // ---------------------------------------------

        resultHTML = `

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
                    class="message result-message"
                ></div>

            </div>

        `;

    }


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


        <button
            class="danger-button cancel-match-button"
            data-id="${match.id}"
        >
            Cancel Match
        </button>


        <div class="message cancel-message"></div>


        ${resultHTML}

    `;


    // =====================================================
    // ADD CARD TO PAGE
    // =====================================================

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

                    const winnerTeamId =
                        button.dataset.teamId;


                    // Disable both buttons while submitting

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


                    const resultMessage =
                        matchCard.querySelector(
                            ".result-message"
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
                                ? (
                                    teamOne?.name ||
                                    "Team 1"
                                )
                                : (
                                    teamTwo?.name ||
                                    "Team 2"
                                );


                        if (resultMessage) {

                            resultMessage.textContent =
                                error.message;

                            resultMessage.className =
                                "message error";

                        }


                        return;
                    }


                    // =====================================
                    // BOTH TEAMS AGREED
                    // =====================================

                    if (data === "completed") {

                        await loadYourMatches();

                        return;
                    }


                    // =====================================
                    // TEAMS DISAGREED
                    // =====================================

                    if (data === "disputed") {

                        await loadYourMatches();

                        return;
                    }


                    // =====================================
                    // ONLY ONE TEAM HAS VOTED
                    // =====================================

                    if (data === "waiting") {

                        if (resultMessage) {

                            resultMessage.textContent =
                                "Your vote has been recorded. Waiting for the other team.";

                            resultMessage.className =
                                "message success";

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

                    console.error(error);


                    resultOkButton.disabled =
                        false;

                    resultOkButton.textContent =
                        "OK";


                    alert(
                        error.message
                    );


                    return;
                }


                /*
                   IMPORTANT:

                   Reload immediately.

                   The other team does NOT need
                   to click OK first.
                */

                await loadYourMatches();

            }
        );

    }

}