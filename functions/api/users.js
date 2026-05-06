export async function onRequest(context) {
    try {
        const { request, env } = context;
        const KV = env.CALENDAR_DATA;
        
        if (!KV) {
            return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Initialize users if empty
        let usersStr = await KV.get("calendar_users");
        let users = usersStr ? JSON.parse(usersStr) : {};
        if (Object.keys(users).length === 0) {
            users["robson"] = { password: "R545e545", isAdmin: true };
            await KV.put("calendar_users", JSON.stringify(users));
        }

        const url = new URL(request.url);

        // GET: List users (Admin only)
        if (request.method === "GET") {
            const authHeader = request.headers.get("Authorization");
            if (!authHeader) return new Response("Unauthorized", { status: 401 });
            
            const [authUser, authPw] = atob(authHeader).split(":");
            if (!users[authUser] || users[authUser].password !== authPw || !users[authUser].isAdmin) {
                return new Response("Forbidden", { status: 403 });
            }

            const userList = Object.keys(users).map(u => ({
                username: u,
                isAdmin: users[u].isAdmin
            }));
            return new Response(JSON.stringify(userList), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // POST: Login, Create, Update, Delete
        if (request.method === "POST") {
            const payload = await request.json();
            const { action, username, password, isAdmin, targetUser, newPassword, displayName, department } = payload;

            // ACTION: LOGIN (Public)
            if (action === "login") {
                if (users[username] && users[username].password === password) {
                    return new Response(JSON.stringify({ 
                        success: true, 
                        isAdmin: users[username].isAdmin,
                        username: username,
                        displayName: users[username].displayName || "",
                        department: users[username].department || ""
                    }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }
                return new Response(JSON.stringify({ success: false, message: "Usuário ou senha incorretos" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Authenticate the request for all other actions
            const authHeader = request.headers.get("Authorization");
            if (!authHeader) return new Response("Unauthorized", { status: 401 });
            const [authUser, authPw] = atob(authHeader).split(":");
            if (!users[authUser] || users[authUser].password !== authPw) {
                return new Response("Forbidden", { status: 403 });
            }

            // ACTION: UPDATE PROFILE (Self)
            if (action === "updateProfile") {
                users[authUser].displayName = displayName;
                users[authUser].department = department;
                await KV.put("calendar_users", JSON.stringify(users));
                return new Response(JSON.stringify({ success: true }));
            }

            // ACTION: UPDATE USERNAME (Self or Admin)
            if (action === "updateUsername") {
                const { targetUser, newUsername } = payload;
                if (!targetUser || !newUsername) return new Response("Missing parameters", { status: 400 });
                
                const oldUsername = targetUser;
                const normalizedNew = newUsername.trim().toLowerCase();

                if (!users[oldUsername]) return new Response("User not found", { status: 404 });
                if (users[normalizedNew]) return new Response("Novo login já está em uso", { status: 400 });

                // If not admin, can only rename self
                if (!users[authUser].isAdmin && oldUsername !== authUser) {
                    return new Response("Forbidden: Cannot rename other user", { status: 403 });
                }

                // Migrate data
                users[normalizedNew] = users[oldUsername];
                delete users[oldUsername];
                
                await KV.put("calendar_users", JSON.stringify(users));
                return new Response("OK");
            }

            // ACTION: CHANGE PASSWORD (Self or Admin)
            if (action === "changePassword") {
                const userToUpdate = targetUser || authUser;
                if (!users[userToUpdate]) return new Response("User not found", { status: 404 });
                
                if (!users[authUser].isAdmin && userToUpdate !== authUser) {
                    return new Response("Forbidden: Cannot change other user's password", { status: 403 });
                }

                users[userToUpdate].password = newPassword;
                await KV.put("calendar_users", JSON.stringify(users));
                return new Response("OK");
            }

            // --- ADMIN ONLY ACTIONS ---
            if (!users[authUser].isAdmin) {
                return new Response("Forbidden: Admin only", { status: 403 });
            }

            if (action === "create") {
                if (!username || !displayName || !department) return new Response("Campos obrigatórios faltando", { status: 400 });
                if (users[username]) return new Response("Usuário já existe", { status: 400 });
                users[username] = { password: "1234", isAdmin: false, displayName, department };
                await KV.put("calendar_users", JSON.stringify(users));
                return new Response("Created", { status: 201 });
            }

            if (action === "updateRole") {
                if (!users[targetUser]) return new Response("Not found", { status: 404 });
                if (targetUser === "robson") return new Response("Não permitido", { status: 403 });
                users[targetUser].isAdmin = !!isAdmin;
                await KV.put("calendar_users", JSON.stringify(users));
                return new Response("OK");
            }

            if (action === "delete") {
                if (!users[targetUser]) return new Response("Not found", { status: 404 });
                if (targetUser === authUser || targetUser === "robson") return new Response("Não permitido", { status: 403 });
                delete users[targetUser];
                await KV.put("calendar_users", JSON.stringify(users));
                return new Response("OK");
            }

            return new Response("Invalid action", { status: 400 });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
