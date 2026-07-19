const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static Files
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "views")));

// Uploads Folder
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
app.use("/uploads", express.static("uploads"));

// MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/notesDB")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// ================= USER SCHEMA =================

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const User = mongoose.model("User", userSchema);

// ================= NOTE SCHEMA =================

const noteSchema = new mongoose.Schema({
    subject: String,
    semester: String,
    description: String,
    filename: String,
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

const Note = mongoose.model("Note", noteSchema);

// ================= ROUTES =================

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Register Page
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

// Login Page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Register
app.post("/register", async (req, res) => {

    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send("Passwords do not match");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.send("Email already exists");
    }

    await User.create({
        name,
        email,
        password
    });

    res.redirect("/login.html");
});

// Login
app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({
        email,
        password
    });

    if (!user) {
        return res.send("Invalid Email or Password");
    }

    res.redirect("/notes.html");
});
// ================= UPLOAD NOTES =================

app.post("/upload", upload.single("notesFile"), async (req, res) => {
    try {

        const { subject, semester, description } = req.body;

        if (!req.file) {
            return res.send("Please select a file.");
        }

        const note = new Note({
            subject,
            semester,
            description,
            filename: req.file.filename
        });

        await note.save();

        res.redirect("/notes.html");

    } catch (err) {
        console.log(err);
        res.send("Upload Failed");
    }
});

// ================= DOWNLOAD NOTES =================

app.get("/download", async (req, res) => {

    const notes = await Note.find();

    let html = `
    <html>
    <head>
        <title>📥Download Notes</title>
        <style>
            body{
                font-family:Arial, sans-serif;
                background:linear-gradient(135deg,hsl(0, 58%, 53%),#62dce2);
                padding:30px;
            }
            
            .card{
                background:white;
                padding:15px;
                margin:15px 0;
                border-radius:10px;
                box-shadow: 0px 10px 10px rgba(0, 0, 0, 0.1);
            }
            a{
                text-decoration:none;
                color:white;
                background:#0077ff;
                padding:8px 15px;
                border-radius:5px;
            }
            a:hover{
                background:grey;
            }           
        </style>
    </head>
    <body>

    <h1 style="color:white;font-family:Times New Roman; font-size:28px;">📥Download Notes</h1>
    `;

    notes.forEach(note => {

        html += `
        <div class="card">

        <h3>${note.subject}</h3>

        <p style="font-style:italic;">Semester : ${note.semester}</p>

        <p>${note.description}</p>

        <a href="/uploads/${note.filename}" target="_blank" download>
        Download
        </a>

        </div>
        `;

    });

    html += "</body></html>";

    res.send(html);

});

// ================= MY NOTES =================

app.get("/mynotes", async (req, res) => {

    const notes = await Note.find();

    let html = `
    <html>
    <head>
    <title>📚My Notes</title>

    <style>

    body{
        font-family:Arial, sans-serif;
        background:linear-gradient(135deg,hsl(205, 35%, 7%),#62dce2);
        padding:30px;
    }

    table{
        width:100%;
        border-collapse:collapse;
        background:white;
        
    }

    th,td{
        border:1px solid #ddd;
        padding:12px;
        text-align:center;
        border-radius:5px;
    }

    th{
        background:#0077ff;
        color:white;
    }

    a{
        text-decoration:none;
        background:red;
        color:white;
        padding:8px 15px;
        border-radius:5px;

    }

    a:hover{
        background:grey;
    }

    </style>

    </head>

    <body>

    <h2 style="color:white;font-family:times new roman; ">📚My Uploaded Notes</h2>

    <table>

    <tr style="font-family:poppins;">

    <th>Subject</th>

    <th>Semester</th>

    <th>Description</th>

    <th>Download</th>

    </tr>
    `;

    notes.forEach(note => {

        html += `
        <tr style="background:white;">

        <td>${note.subject}</td>

        <td>${note.semester}</td>

        <td>${note.description}</td>

        <td>

        <a href="/uploads/${note.filename}" download>

        Download

        </a>

        </td>

        </tr>
        `;

    });

    html += `
    </table>

    </body>

    </html>
    `;

    res.send(html);

});


// ================= SEARCH NOTES =================

app.get("/search", async (req, res) => {

    const keyword = req.query.subject;

    const notes = await Note.find({

        subject: {
            $regex: keyword,
            $options: "i"
        }

    });

    let html = `
    <html>
    <head>
    <title>🔍Search Result</title>
    <style>
    body{
    font-family:Times New Roman;
    background:#f5f5f5;
    padding:30px;
    }
    table{
    width:100%;
    border-collapse:collapse;
    background:white;
    }
    th,td{
    padding:12px;
    border:1px solid #ddd;
    text-align:center;
    }
    th{
    background:#0077ff;
    color:white;
    }
    a{
    background:#28a745;
    color:white;
    padding:8px 15px;
    text-decoration:none;
    border-radius:5px;
    }
    </style>
    </head>
    <body>
    <h2>🔍Search Results</h2>
    <table>
    <tr>
   
    <th>Subject</th>
    <th>Semester</th>
    <th>Description</th>
    <th>Download</th>
    
    </tr>
`;

notes.forEach(note=>{

html +=`

<tr>

<td>${note.subject}</td>

<td>${note.semester}</td>

<td>${note.description}</td>

<td>

<a href="/uploads/${note.filename}" download>

Download

</a>

</td>

</tr>

`;

});

html +=`

</table>

</body>

</html>
`;

res.send(html);

});

// ================= SERVER =================

app.listen(PORT, () => {

    console.log(`🚀 Server Running : http://localhost:${PORT}`);

});