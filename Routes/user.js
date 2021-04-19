const router = require('express').Router();
const db = require('../services/db');
const keys = require('../config/keys');
const bcrypt = require('bcrypt');

function checkLoginUser(req,res){
    if(req.session.userKey != keys.userKey){
        res.render('../auth/logout');
    }
    return;
}

function checkError(error,res){
    if(error){
        console.log({success:false,message:'database error',err:error});
        res.send({success:false,message:'database error',err:error});
    }
}


router.get('/',(req,res) => {
    checkLoginUser(req,res);

    let issuedBooks,holdBooks,total_fine=0;

    let query = 'SELECT * FROM book WHERE borrowed_id = '+req.session.user_id;

    db.query(query,(error,result) => {
        checkError(error,res);

        issuedBooks = result;

        let query = 'SELECT * FROM book WHERE holder_id = '+ req.session.user_id;

        db.query(query,(error,result) => {
            checkError(error,res);

            holdBooks = result;

            let query = 'SELCT SUM(fine_amount) AS total_fine FROM fine WHERE user_id ='+req.session.user_id+' GROUP BY user_id';

            db.query(query,(error,result) => {
                checkError(error,res);

                if(result.length > 0){
                    total_fine = result[0].total_fine;
                }
                res.render('userHome.ejs',{
                    issuedBooks : issuedBooks,
                    holdBooks : holdBooks,
                    total_fine : total_fine
                })
            })
        })
    })

    
})

router.put('/holdBook',(req,res) => {
    checkLoginUser(req,res);

    let query = 'SELECT holder_id FROM book WHERE book_id = '+req.body.book_id+ ' AND holder_id IS NOT NULL';

    let on_hold;

    db.query(query,(error,results) => {
        checkError(error,res);
        on_hold = results.length > 0;

        if(on_hold){
            res.render('userHome.ejs');
        }
        else{
            query = 'UPDATE book SET ?';
            let post = {
                holder_id : req.session.user_id,
                hold_date : new Date()
            }
    
            db.query(query,post,(err,result) => {
                checkError(err,res);
                res.render('userHome.ejs');
            })
        }
    })
})

router.get('/searchBook',(req,res) => {
    checkLoginUser(req,res);
    var criterion = req.query.criterion;
    var keyword = req.query.keyword;

    console.log(criterion);
    console.log(keyword);

    if(criterion == 'name'){
        
        let query = "SELECT * FROM book WHERE title LIKE '%"+keyword+"%'";

        db.query(query,(error,result) => {
            checkError(error,res);
            console.log(result);
            res.render('userHome.ejs');
        })
    }
    else if(criterion == 'ISBN'){
        let query = "SELECT * FROM book WHERE ISBN LIKE '%"+keyword+"%'";

        db.query(query,(error,result) => {
            checkError(error,res);
            console.log(result);
            res.render('userHome.ejs');
        })
    }
    else if(criterion == 'author'){
        let query = "SELECT * FROM book WHERE EXISTS (SELECT author_id FROM author WHERE author.author_id = book.author_id AND author.name LIKE '%"+keyword+"%')";
        
        db.query(query,(error,result) => {
            checkError(error,res);
            console.log(result);
            res.render('userHome.ejs');
        })
    }
})

router.put('/changePassword',(req,res) => {
    checkLoginUser(req,res);

    let old_password = req.body.old_password;
    let new_password = req.body.new_password;

    let query = 'SELECT password FROM user WHERE user_id = '+req.session.user_id;

    let old_password_db;

    db.query(query,(err,result) => {
        checkError(err,res);
        
        old_password_db = result[0].password;

        bcrypt.compare(old_password,old_password_db)
        .then((same_old) => {
            
            if(!same_old){
                res.render('userHome.ejs')
            }
            else{
                let encryptedPassword;
                query = 'UPDATE user SET ?';
        
                bcrypt.hash(new_password,keys.saltRounds)
                .then((password) => {
                    encryptedPassword = password;
                    let post = {
                        password : encryptedPassword
                    }
            
                    db.query(query,post,(err,result) => {
                        checkError(err,res);
                        res.render('userHome.ejs');
                    })
                })
                .catch((error) => {
                    res.render('error.ejs');
                })
            }
        })
        .catch((error) => {
            console.log(error);
            res.render('error.ejs');
        })
    })
    
    
})

module.exports = router;