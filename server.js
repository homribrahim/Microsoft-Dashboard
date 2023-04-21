const { response, urlencoded } = require('express');
const express = require('express');
const app = express();

const { pool } = require("./dbConfig", { multipleStatements: true });
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');

const passport = require('passport');
const initializePassport = require('./passportConfig');
initializePassport(passport);

const PORT = process.env.PORT || 3000;


const moment = require('moment');
app.locals.moment = moment;
const axios = require('axios');

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/'))

app.use(express.urlencoded({ extended: false }));// middlewear that sends data from front end to server 

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/", (req, res) => {
    res.render("official");
})

app.get('/users/register', (req, res) => {
    res.render("register");
})

app.get('/users/login', (req, res) => {
    res.render("login");
})


app.get('/users/fiche', (req, res) => {
    res.render("fiche", {
        link: req.user.url,
        name: req.user.name
    });
})

app.get('/users/infos_societe', (req, res) => {
    res.render("infos_societe");
})

app.get('/users/edit_profile', (req, res) => {
    res.render("edit_profile", {
        name: req.user.name
    })
})

app.get('/users/des_profile', (req, res) => {
    res.render("des_profile", {
        name: req.user.name
    });
})

app.get('/users/help', (req, res) => {
    res.render("help");
})

app.get('/users/contact', (req, res) => {
    res.render("contact");
})


app.get('/users/index', (req, res) => {
    console.log("Success TO INDEX");
    pool.query(
        `SELECT COUNT(*) FROM users;
        SELECT COUNT(*) FROM users WHERE dep='Informatique';
        SELECT * FROM users WHERE dep='Informatique' ORDER BY point DESC`,
        (err, results) => {
            if (err) {
                console.log(err);
            }
            else {
                let tab = [];
                console.log(results[0]);
                console.log(results[1]);
                for (let i = 0; i < results[1].rows[0].count; i++) {
                    /*console.log(results[2].rows[i].name); */
                    let str = results[2].rows[i].name;
                    let str1 = (i + 1).toString();
                    tab.push(str1 + "/" + str);
                }
                res.render('index', {
                    user: req.user.name,
                    rev: req.user.revenue,
                    min: req.user.temps_min,
                    heure: req.user.temps_heure,
                    pts: req.user.point,
                    employe_tot: results[0].rows[0].count,
                    employe_dep: results[1].rows[0].count,
                    depart: req.user.dep,
                    tab
                });
            }
        })

})

app.get('/users/home', async (req, res) => {

    try {
        var lien = 'http://newsapi.org/v2/everything?q=${technology}&apiKey=50d91b8dda21403ca35c030a493a6a96';

        const news_get = await axios.get(lien)
        res.render('home', { art: news_get.data.articles })

    } catch (error) {
        if (error.response) {
            console.log(error)
        }

    }
})

app.post('/users/home', async (req, res) => {
    const search = req.body.search
    //console.log(req.body.search)

    try {
        var url = `http://newsapi.org/v2/everything?q=${search}&apiKey=36f3e29b704f41339af8439dc1228334`

        const news_get = await axios.get(url)
        res.render('home', { art: news_get.data.articles })

    } catch (error) {
        if (error.response) {
            console.log(error)
        }
    }
})

//Don't Forget The Logout 

/* app.get('/users/logout', (req, res) => {
    req.logOut();
    req.flash("You Have Logged Out");
    req.redirect('/users/login');
});
 */

app.post('/users/des_profile', (req, res) => {
    let { idUser } = req.body;
    pool.query(
        `DELETE FROM users WHERE id=$1`,
        [idUser],
        (err, results) => {
            if (err) {
                console.log(err)
            }
            res.redirect('/users/login');
        })
}
)

app.post('/users/register', async (req, res) => {
    let { name, email, department, password, password2 } = req.body;
    console.log({
        name,
        email,
        department,
        password,
        password2,
    })

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Veuillez Remplir Tous Les Champs" });
    }
    if (password.length < 6) {
        errors.push({ message: "Le Mot De Passe Doit Contenir Au Minimum 6 Caractères" });
    }
    if (password != password2) {
        errors.push({ message: "Mot De Passe Non Identique" });
    }
    if (errors.length > 0) {
        res.render('register', { errors })
    }
    else {
        //form validation has passed

        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword); //password for database

        pool.query(
            `SELECT * FROM users
              WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    console.log(err);
                }
                console.log(results.rows);
                if (results.rows.length > 0) {
                    errors.push({ message: "Utilisateur Existe Déja" });
                    res.render('register', { errors })
                }
                else {
                    url = " "
                    pool.query(
                        `INSERT INTO users (name,email,dep,password,url)
                        VALUES ($1,$2,$3,$4,$5)
                        RETURNING id,password`, [name, email, department, hashedPassword, url], (err, results) => {
                        if (err) {
                            throw err
                        }
                        req.flash('success_msg', "Bien Enregistré ! Allons-Y !");
                        res.redirect('/users/login');
                    }
                    )
                }
            }
        );

    }
});

app.post('/users/contact', async (req, res) => {

    let { nom, recette, description } = req.body;

    pool.query(
        `INSERT INTO recette (nom,type,description)
        VALUES ($1,$2,$3)`,
        [nom, recette, description], (err, results) => {
            if (err) {
                throw err
            }
            req.flash('success_msg', "Recette Bien Enregistré !");
            res.redirect('/users/contact');
        }
    )
})

app.post('/users/edit_profile', async (req, res) => {
    let { firstName, email, newpassword, idU } = req.body;

    let hashedPassword = await bcrypt.hash(newpassword, 10);

    pool.query(
        `UPDATE users SET name=$1,email=$2,password=$3 WHERE id=$4`,
        [firstName, email, hashedPassword, idU], (err, results) => {
            if (err) {
                throw err
            }
            req.flash('success_msg', "Vos Informations Sont Mis à Jour !");
            res.redirect('/users/edit_profile');
        }
    )
})


app.post("/users/login", passport.authenticate('local', {
    successRedirect: "/users/index",
    failureRedirect: "/users/login",
    failureFlash: true
}));

/* function checkAuthenticated(req, res, next) {
     if (req.isAuthenticated()) {
        return res.redirect("/users/index");
    }
    next();
}
 
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/users/login");
} */




app.listen(PORT, () => {
    console.log(`Server Running On Port ${PORT}`);
});