const firstnameElement =
    document.getElementById("firstname");

const emailElement =
    document.getElementById("email");

const teamContainer =
    document.getElementById("team-container");

const teamActions =
    document.getElementById("team-actions");

const leaveContainer =
    document.getElementById("leave-container");

const logoutButton =
    document.getElementById("logout-button");

const createTeamForm =
    document.getElementById("create-team-form");

const joinTeamForm =
    document.getElementById("join-team-form");

const createMessage =
    document.getElementById("create-message");

const joinMessage =
    document.getElementById("join-message");


let currentUser = null;


// =========================================================
// LOAD DASHBOARD
// =========================================================

async function loadDashboard() {

    const {
        data: {
            user
        },
        error
    } = await db.auth.getUser();


    if (error || !user) {

        window.location.href = "login.html";

        return;
    }


    currentUser = user;


    emailElement.textContent = user.email;


    // Get first name
    const {
        data: profile,
        error: profileError
    } = await db
        .from("profiles")
        .select("firstname")
        .eq("id", user.id)
        .maybeSingle();


    if (profileError) {

        console.error(
            "PROFILE ERROR:",
            profileError
        );

        firstnameElement.textContent = "Unknown";

    } else if (!profile) {

        firstnameElement.textContent = "Unknown";

    } else {

        firstnameElement.textContent =
            profile.firstname;

    }


    await loadTeam();

}


// =========================================================
// LOAD TEAM
// =========================================================

async function loadTeam() {

    console.log("Loading team...");


    // Find user's team membership
    const {
        data: membership,
        error: membershipError
    } = await db
        .from("team_members")
        .select("team_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();


    if (membershipError) {

        console.error(
            "MEMBERSHIP ERROR:",
            membershipError
        );

        teamContainer.innerHTML = `
            <div class="message error">
                ${escapeHTML(membershipError.message)}
            </div>
        `;

        return;
    }


    // User doesn't have a team
    if (!membership) {

        teamContainer.innerHTML = `
            <p>
                You are not currently on a team.
            </p>
        `;

        teamActions.style.display = "grid";

        leaveContainer.innerHTML = "";

        return;
    }


    console.log(
        "Team ID:",
        membership.team_id
    );


    // Get team
    const {
        data: team,
        error: teamError
    } = await db
        .from("teams")
        .select("id, name, code, total_points")
        .eq("id", membership.team_id)
        .single();


    if (teamError) {

        console.error(
            "TEAM ERROR:",
            teamError
        );

        teamContainer.innerHTML = `
            <div class="message error">
                Team Error: ${escapeHTML(teamError.message)}
            </div>
        `;

        return;
    }


    // Get team members
    const {
        data: members,
        error: membersError
    } = await db
        .from("team_members")
        .select("user_id")
        .eq("team_id", team.id);


    if (membersError) {

        console.error(
            "MEMBERS ERROR:",
            membersError
        );

        teamContainer.innerHTML = `
            <div class="message error">
                Members Error: ${escapeHTML(membersError.message)}
            </div>
        `;

        return;
    }


    // Get profiles separately
    // This avoids problems with nested Supabase relationships.
    const userIds = members.map(
        member => member.user_id
    );


    let memberNames = [];


    if (userIds.length > 0) {

        const {
            data: profiles,
            error: profilesError
        } = await db
            .from("profiles")
            .select("id, firstname")
            .in("id", userIds);


        if (profilesError) {

            console.error(
                "PROFILES ERROR:",
                profilesError
            );

            teamContainer.innerHTML = `
                <div class="message error">
                    Profile Error:
                    ${escapeHTML(profilesError.message)}
                </div>
            `;

            return;
        }


        memberNames = profiles.map(
            profile => profile.firstname
        );

    }


    teamContainer.innerHTML = `

        <div class="team-details">

            <div class="team-detail">

                <span class="team-label">
                    Team Name
                </span>

                <strong>
                    ${escapeHTML(team.name)}
                </strong>

            </div>


            <div class="team-detail">

                <span class="team-label">
                    Team Members
                </span>

                <strong>
                    ${memberNames
                        .map(name => escapeHTML(name))
                        .join(", ")}
                </strong>

            </div>


            <div class="team-detail">

                <span class="team-label">
                    Team Code
                </span>

                <strong class="team-code">
                    ${escapeHTML(team.code)}
                </strong>

            </div>

        </div>

    `;


    // Hide create/join
    teamActions.style.display = "none";


    // Show leave button
    leaveContainer.innerHTML = `

        <button
            id="leave-team-button"
            class="danger-button"
        >
            Leave Team
        </button>

    `;


    document
        .getElementById("leave-team-button")
        .addEventListener(
            "click",
            leaveTeam
        );

}


// =========================================================
// CREATE TEAM
// =========================================================

createTeamForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const teamName =
            document
                .getElementById("team-name")
                .value
                .trim();


        createMessage.textContent =
            "Creating team...";

        createMessage.className =
            "message";


        const {
            data,
            error
        } = await db.rpc(
            "create_team",
            {
                team_name: teamName
            }
        );


        if (error) {

            console.error(
                "CREATE TEAM ERROR:",
                error
            );

            createMessage.textContent =
                error.message;

            createMessage.className =
                "message error";

            return;
        }


        createMessage.textContent =
            "Team created successfully!";

        createMessage.className =
            "message success";


        createTeamForm.reset();


        await loadTeam();

    }
);


// =========================================================
// JOIN TEAM
// =========================================================

joinTeamForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const teamCode =
            document
                .getElementById("join-code")
                .value
                .trim()
                .toUpperCase();


        joinMessage.textContent =
            "Joining team...";

        joinMessage.className =
            "message";


        const {
            data,
            error
        } = await db.rpc(
            "join_team",
            {
                team_code: teamCode
            }
        );


        if (error) {

            console.error(
                "JOIN TEAM ERROR:",
                error
            );

            joinMessage.textContent =
                error.message;

            joinMessage.className =
                "message error";

            return;
        }


        joinMessage.textContent =
            "You joined the team!";

        joinMessage.className =
            "message success";


        joinTeamForm.reset();


        await loadTeam();

    }
);


// =========================================================
// LEAVE TEAM
// =========================================================

async function leaveTeam() {

    const confirmed =
        confirm(
            "Are you sure you want to leave your team?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } = await db.rpc(
        "leave_team"
    );


    if (error) {

        console.error(
            "LEAVE TEAM ERROR:",
            error
        );

        alert(error.message);

        return;
    }


    await loadTeam();

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
// HTML ESCAPING
// =========================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================================================
// START
// =========================================================

loadDashboard();