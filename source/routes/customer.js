const express = require("express");
const cr = express.Router();

const firebase = require('../authConnection').firebase;
const db = require('../connection').db;
let FieldValue = require('firebase-admin').firestore.FieldValue;
function getSurveyList(id){
    return db.collection('Customers').doc(id).get();

 }
async function getSurveys(id,status, callback){

    let openSurveys = [];
    let closeSurveys = [];
    let draftSurveys = [];
    let snapshot = await getSurveyList(id);
    //console.log(snapshot.data().surveylist);
    //console.log((snapshot.data().surveylist).includes('K0MLUyw4nTMYMyVhrruy'));

    let survyesIds = snapshot.data().surveylist;
    let surveySnapshot=await db.collection('Survey').get();
        surveySnapshot.forEach(survey =>{
            let doc = survey.data();
            doc.id = survey.id;
           // console.log(survey.id)
            if(survyesIds.includes(survey.id) && doc.status == 'draft') { draftSurveys.push(doc);  }
            else if(survyesIds.includes(survey.id) && doc.status == 'open') {openSurveys.push(doc); }
            else if(survyesIds.includes(survey.id) && doc.status == 'close') {closeSurveys.push(doc);}
            else console.log(survey.id,"does not match");
           // console.log(survey.id);

        });
    // console.log(draftSurveys);
    // console.log(openSurveys);
    // console.log(closeSurveys);

    if(status =='draft'){
        //let surveys = {"survey":draftSurveys};
        //console.log();


        //console.log("soreted",draftSurveys[0].lastEdited.toDate());
      if(draftSurveys.length){
        draftSurveys.sort((a,b) =>{
            //console.log( a.lastEdited._seconds, b.lastEdited._seconds);
            return new Date(b.lastEdited) - new Date(a.lastEdited);
          })
    //       for (var i = 0; i < openSurveys.length; i++){
    //         draftSurveys[i].lastEdited = (draftSurveys[i].lastEdited.toDate());
    // }

        callback(0,{"survey":draftSurveys, "found":1})
         }
      else {
        callback(1, {"survey":null, "found":0});
        //reject("draft surveys not found");
      }
    }
    else if(status =='open'){
        //let surveys = {"survey":openSurveys};


        if(openSurveys.length){
            openSurveys.sort((a,b) =>{
                //   console.log( a.closeTime._seconds, b.closeTime._seconds);
                 //  return a.closeTime._seconds - b.closeTime._seconds;
                    return new Date(b.closeTime) - new Date(a.closeTime)
                 })
            // for (var i = 0; i < openSurveys.length; i++){
            //         openSurveys[i].closeTime = (openSurveys[i].closeTime.toDate());
            // }
           // console.log("open survey",openSurveys);
            callback(0,{"survey":openSurveys, "found":1})
             }
          else {
            callback(1, {"survey":null, "found":0});
            //reject("draft surveys not found");
          }
      }
      else if(status =='close'){

        if(closeSurveys.length){
            closeSurveys.sort((a,b) =>{
                //   console.log( a.closeTime._seconds, b.closeTime._seconds);
                 //  return  b.closeTime._seconds -a.closeTime._seconds;
                    return new Date(b.closeTime) - new Date(a.closeTime)
                 })
            //      for (var i = 0; i < closeSurveys.length; i++){
            //        closeSurveys[i].closeTime = (closeSurveys[i].closeTime.toDate());
            //    }


            callback(0,{"survey":closeSurveys, "found":1})
             }
          else {
            callback(1, {"survey":null, "found":0});
            //reject("draft surveys not found");
          }
      }
      else callback(0 ,{"found":0})



}
cr.get('/login', (req,res) =>{

    res.render('./customerViews/login');
})

cr.post('/handlelogin', async (req,res) =>{

    var email = req.body.email;
    var password = req.body.password;
    sess = req.session;

    await firebase.auth().signInWithEmailAndPassword(email, password)
    .then( (user) =>{
         console.log("signin",user.user.uid);
         sess.uid = user.user.uid;

        })
    .catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // [START_EXCLUDE]
        if (errorCode === 'auth/wrong-password') {
          console.log('Wrong password.');
        } else {
            console.log(errorMessage);
        }
        console.log(error);

        res.send(false);
      });
    sess.email = email;
    res.send(true);
    //res.redirect('/paypersurvey-67687/us-central1/app/customer/');
})

cr.get('/logout', (req,res) =>{
    req.session.destroy( (error) =>{
        if(error) console.log(error);
        else res.redirect('/');
    })

})

cr.get('/register', (req,res) =>{
    res.render('./customerViews/register');
})

cr.post('/handleRegisteration', async (req,res) =>{

    name = req.body.name;
    email = req.body.email;
    password =req.body.password;
    conf_password = req.body.conf_password;

    //console.log(name,email, password, conf_password);

    await firebase.auth().createUserWithEmailAndPassword(email,password)
    .then(customer=>{
        console.log('customer',customer.user.uid);
        let id = customer.user.uid;
        console.log(id);
     db.collection('Customers').doc(id).set({
        name: name,
        email: email,
        password: password,
        balance: 0,
        surveylist: []

    })
    res.send(true);
    })
    .catch( (error) =>{
        console.log("signup err", error.message);
        res.send(false);

    })


})

cr.get('/', (req,res) =>{

    if(req.session.email){
        //dataset = {email: req.session.email, uid: req.session.uid};
        //console.log(req.session.email);
        //console.log("welcome customer sceen")
        let id= req.session.uid;
        console.log(id);

        db.collection('Customers').doc(id).get()
        .then(snapshot=>{
            console.log(snapshot.data());
            data ={id:id, balance:snapshot.data().balance}
            res.render('./customerViews/dashboard',data)

        })

    }
    else res.redirect('/customer/login');

})

cr.post('/updatebalance', (req,res) =>{

    let id = req.param('id');
    console.log(req.body.balance);

    const increment = FieldValue.increment(parseInt(req.body.balance));
    db.collection('Customers').doc(id).update({balance: increment})
    res.redirect('/customer/');

})

cr.get('/draftSurvey', (req,res) =>{

    if(req.session.email){
        //dataset = {email: req.session.email, uid: req.session.uid};
        //console.log(req.session.email);
        //console.log("welcome customer sceen")
        getSurveys(req.session.uid,'draft', (err,surveys) =>{
            if(!err){
                 console.log("survey",surveys);
                 res.render('./customerViews/draftSurvey',surveys);
            }
            else{
                console.log("survey",surveys);
                console.log("surveys not found");
                res.render('./customerViews/draftSurvey',surveys);
            }

        })

    }
    else res.redirect('/customer/login');

})
cr.get('/openSurvey', (req,res) =>{

    if(req.session.email){
        //dataset = {email: req.session.email, uid: req.session.uid};
        //console.log(req.session.email);
        //console.log("welcome customer sceen")
        getSurveys(req.session.uid,'open', (err,surveys) =>{

            if(!err){
                console.log("survey",surveys);
                res.render('./customerViews/openSurvey',surveys);
           }
           else{
            //   console.log("survey",surveys);
             //  console.log("surveys not found");
               res.render('./customerViews/openSurvey',surveys);
           }
        })

    }
    else res.redirect('/customer/login');

})

cr.get('/closedSurvey', (req,res) =>{

    if(req.session.email){
        //dataset = {email: req.session.email, uid: req.session.uid};
        //console.log(req.session.email);
        //console.log("welcome customer sceen")
        getSurveys(req.session.uid,'close', (err,surveys) =>{
        if(!err){
                 //console.log("survey",surveys);
                 res.render('./customerViews/closedSurvey',surveys);
            }
            else{
               // console.log("survey",surveys);
                console.log("surveys not found");
                res.render('./customerViews/closedSurvey',surveys);
            }
        })

    }
    else res.redirect('/customer/login');

})

cr.get('/targetAudience', (req,res) =>{
    //console.log(req.param('id'));
    let sid =req.param('id');
    console.log('sid',sid);
    db.collection('TargetAudience').doc(sid).get()
    .then(doc =>{

            console.log('if');
            let data = doc.data();
            data.id = sid;
            data.layout = false;
             console.log('target audience ',data);
            res.render('./customerViews/targetAudience',data);

    })
    .catch( err =>{
        console.log("target audience",err);


    })

})
cr.post('/updateTA', async (req,res)=>{
    //console.log('updateTA');
    let atr = req.param('ta_atr');
   // console.log(atr);
    let sid = req.param('id');
    let ta ={};
    if(atr == 'location'){
        ta.location = req.body.location;
    }
    else if(atr == 'gender'){
        ta.gender = req.body.gender;
    }
    else if(atr == 'age'){
        ta.ageR_1 = req.body.range_1;
        ta.ageR_2 = req.body.range_2;
        }
   else if(atr == 'education'){
        ta.education = req.body.education;
   }
   else if(atr == 'marital_status'){
       //console.log('marital if');
       ta.marital_status = req.body.Status;
   }
   else if(atr == 'income'){
    //console.log('marital if');
    ta.incomeR_1 = req.body.incomeR_1;
    ta.incomeR_2 = req.body.incomeR_2;
}
else if(atr == 'occupation'){
    //console.log('marital if');
    ta.occupation = req.body.occupation;
}
else if(atr == 'religion'){
    //console.log('marital if');
    ta.religion = req.body.religion;
}
    else {}
    console.log('sid',sid);
   // console.log(ta);
   await db.collection('TargetAudience').doc(sid).set(ta,{merge:true});

   db.collection('TargetAudience').doc(sid).get()
    .then(doc =>{

            //console.log('if');
            let data = doc.data();
            data.id = sid;
            data.layout = false;
             console.log('updated target audience',data);
            res.render('./customerViews/targetAudience',data);

    })
    .catch( err =>{
        console.log("target audience",err);


    })


})

cr.get('/buypackage', (req,res) =>{

    let sid = req.param('id');
   // console.log('buy package sid',sid);
    db.collection('Survey').doc(sid).get()
    .then(snapshot =>{
        //console.log(Object.getOwnPropertyNames(snapshot.data().questions).length);
        let totalQuestions = Object.getOwnPropertyNames(snapshot.data().questions).length;
        data ={id:sid, totalQuestions:totalQuestions, layout:false};
       // console.log(data);
        //console.log(req.session.uid);
        db.collection('Customers').doc(req.session.uid).get()
        .then(snap=>{
          //  console.log(snap.id,'=>',snap.data());

            data.balance = snap.data().balance;
          //  console.log(data);
            res.render('./customerViews/buyPackage',data);
        })
        .catch(err =>{
            console.log(err);
        })


    })
    // if(req.session.email){
    //     //dataset = {email: req.session.email, uid: req.session.uid};
    //     //console.log(req.session.email);
    //     //console.log("welcome customer sceen")
    // }
    // else res.redirect('/customer/login');

})


cr.get('/createsurvey',(req,res)=>{
    let id='sid'+new Date().getTime()
    let lastEdited = new Date().toLocaleString();
    console.log('id=>',id,'last edited',lastEdited);
    db.collection('Survey').doc(id).set({
        title:'Untitled Survey',
        description:'',
        lastEdited: lastEdited,
        status:'draft'

    },{merge:true})
    console.log('survey created in survey doc');
    db.collection('Customers').doc(req.session.uid).set({
        surveylist:FieldValue.arrayUnion(id)
    },{merge:true})
    .then(result=>{
        console.log('survey created in customer doc')
    })
    db.collection('TargetAudience').doc(id).set({
        ageR_1:15,
        ageR_2:70,
        education:"All",
        gender:"All",
        incomeR_1:0,
        incomeR_2:10000,
        location:'Pakistan',
        marital_status:"All",
        occupation:"All",
        religion: "All"

    })
    .then(result=>{
        console.log('target audience added');
    })

    res.render('./customerViews/builder',{id:id});
});

cr.get('/delsurvey',(req,res)=>{
    let sid = req.param('id');
    console.log(sid);
    db.collection('Survey').doc(sid).delete();
    res.redirect('/customer/draftSurvey');
})
cr.get('/result',(req,res)=>{

   // let id ='mjjwZVGvKwYmWhCmEOA6ZnbRM5v1';
   //let surveyId = '1565023337490';
   let surveyId = req.param('id');
    db.collection('Survey').doc(surveyId).get()
    .then(snapshot=>{

        // console.log(snapshot.data().options)
        // snapshot.data().questions.options.forEach(opt=>{
        //     console.log('opt=>',opt);
        // })

        // console.log('snapshot=>',snapshot.data())
         let q =[];

        let key =Object.keys(snapshot.data().questions);
        for(let i =0; i<key.length; i++){
        //    console.log(snapshot.data().questions[key[i]]);
            q[i]= snapshot.data().questions[key[i]].options;
           console.log(snapshot.data().questions[key[i]].options);
        }
       //  console.log("data=>",q);
        //console.log(q);

        res.render('./customerViews/results',snapshot.data());
      //  res.render('./customerViews/results',snapshot.data());
    })
    .catch(err=>{
        console.log(err);
    })

});


cr.post('/send/:id',(req,res)=>{
    let id = req.params.id;
    console.log(id);
  //  console.log(id);
    //console.log(id.toString());
    //let basic_res = req.body.basic_res;
    let basic = parseInt(req.body.basic_res);
    let standard = parseInt(req.body.standard_res);
    let premium = parseInt(req.body.premium_res);
    total_res = basic +standard + premium;
    let closeTime = new Date(req.body.closeTime);
    console.log(closeTime);

    let data = {
        package: {
            basic: basic,
            standard: standard,
            premium: premium
        },
        closeTime: req.body.closeTime,
        total_response:total_res,
        comp_response: 0,
        status:'open',



    }
    db.collection('Survey').doc(id).update(data);
    db.collection('TargetAudience').doc(id).get()
    .then(snapshot=>{
        console.log('send target audience',snapshot.data());


    })
    //console.log(data);
    res.redirect('/customer/openSurvey');

})
cr.post('/updatesurvey',(req,res)=>{
    console.log('update survey called');
    let sid=req.body.id;
    let title=req.body.surveyTitle;
    let desc=req.body.surveyDesc;
    let lastEdited=new Date().toLocaleString();

    db.collection('Survey').doc(sid).set({
        title:title,
        description:desc,
        lastEdited:lastEdited,

    },{merge:true})
    .then(result=>{
        console.log('last edited',lastEdited);
    })
    .catch(err=>{
        console.log('update survey err',err)
    })

})
cr.post('/addquestion',(req,res)=>{
    //console.log();
    let sid=req.body.sid;
    let id =req.body.qid;
    var keys = Object.keys(req.body);
    console.log(keys);

    let title="";
    let q_type="";
    let options ={};
    let optioncount = 0;
    let cf = 0;
    let q_no = 0;
    let wordcount;
    let opt_word_count=0;
    let title_count=0;
    op = {}
    let lastEdited=new Date().toLocaleString();
    if(req.body[keys[1]] == 2){
        console.log(req.body);
        title = req.body[keys[0]];
        temp =title.replace(/ /g, "")
        title_count = temp.length;
            //console.log();
        let readTime = (title_count)/280;
        let req_time = readTime + cf;

        data ={
        lastEdited:lastEdited,
            questions:{
                [id]:{
                    title: req.body[keys[0]],
                    q_type:'text',
                    cf:req.body[keys[2]],
                    q_no:req.body[keys[4]],
                    req_time:req_time
                }
            }

        }

    }
    else{
        for (var i = 0; i < keys.length; i++) {
            if(keys[i].includes('Title')){

                title = req.body[keys[i]];
                temp =title.replace(/ /g, "")
                //console.log();
                title_count = temp.length;
             //   console.log('titile',title_count);
            }
            else if(keys[i].includes('OptionType')){
                q_type = req.body[keys[i]];
                if(q_type =='0') q_type = 'radio';
                else if(q_type =='1') q_type = 'checkbox';
                else q_type = 'text';

                //console.log('option type');
            }
            else if(keys[i].includes('Option')){
                result=keys[i].split('Option');
                let oid =parseInt(result[1]);
                console.log(oid);
                op_title= req.body[keys[i]];
                temp =op_title.replace(/ /g, "")
                //console.log();
                opt_word_count = opt_word_count + temp.length;
                options = Object.assign({[oid]:{op_res:0, op_title: req.body[keys[i]]}},options)
              //  console.log('opt count',opt_word_count);
            //    options[optioncount] ={
            //        [oid]:{
            //         op_res:0,
            //         op_title: req.body[keys[i]]

            //        }


            // }
               //optioncount++;
            }
            else if(keys[i].includes('Complexity')){
                cf = req.body[keys[i]];
                optioncount++;
             }
             else if(keys[i].includes('q_no')){
                  q_no  = req.body[keys[i]];

             }
             else{}

        }
        console.log('words',opt_word_count+title_count);

        //calculate required time

        let readTime = (opt_word_count + title_count)/280;
        let req_time = readTime + cf;

        //console.log(id,q_no,title,q_type,options,cf);
        data ={
            lastEdited:lastEdited,

            questions:{
                [id]:{
                    q_no: q_no,
                    q_type:q_type,
                    title: title,
                    cf:cf,
                    options:options,
                    req_time:req_time
                }
            }

        }

    }
    console.log(JSON.stringify(options));
    console.log('data=>',data);

    db.collection('Survey').doc(sid).set(data,{merge:true});

    res.send('1');
})
cr.post('/updateoption',(req,res)=>{

    let qid=parseInt(req.body.qid);
    let sid=(req.body.sid);
    let oid=parseInt(req.body.oid);
    console.log(sid,qid,oid)
    let lastEdited=new Date().toLocaleString();
    db.collection('Survey').doc(sid).set({
        lastEdited:lastEdited,
        questions:{
            [qid]:{
                options:{
                    [oid]:FieldValue.delete()
                }
            }
        }
       },{merge:true})
    .then(snapshot=>{
        res.send('1');
    })
    .catch(err=>{
        console.log(err);
        res.send('0');
    })

})
cr.post('/deletequestion',(req,res)=>{
    let sid=req.body.sid;
    let qid=req.body.qid;
    let lastEdited=new Date().toLocaleString();
    db.collection('Survey').doc(sid).set({
        lastEdited:lastEdited,
        questions:{
            [qid]:FieldValue.delete()
        }
       },{merge:true})
    .then(snapshot=>{
        res.send('1');
    })
    .catch(err=>{
        console.log(err);
        res.send('0');
    })
    // res.send(true);
})

/* my code */
cr.get('/editsurvey',(req,res)=>{
    //let id=new Date().getTime();
    //let surveyId = req.param('id');
    let surveyId = 'zXIH49G41Brvt7cERycV';

    db.collection('Survey').doc(surveyId).get()
    .then(snapshot=>{
        res.render('./customerViews/editsurvey',snapshot.data());

    })
    .catch(err=>{
        console.log(err);
    })

    //res.render('./customerViews/editsurvey');
});

module.exports = cr;