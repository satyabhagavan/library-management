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
    res.render('userHome.ejs');
})

router.put('/holdBook',(req,res) => {
    checkLoginUser(req,res);

    let query = 'SELECT holder_id FROM book WHERE book_id = '+req.body.book_id+ ' AND holder_id IS NOT NULL';

    let on_hold;

    db.query(query,(error,results) => {
        checkError(error,res);
        on_hold = results.length > 0;
    })
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

router.get('/searchBook',(req,res) => {
    checkLoginUser(req,res);
    var criterion = req.query.criterion;
    var keyword = req.query.keyword;
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