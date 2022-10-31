const express = require('express')
const router = express.Router()
const upload = require('../middlewares/upload')
const seedData = require('../seed/seed.json')
const User = require('../models/user')

/*
- Setup the RESTful routes
    - Index Route / Home Route
    - Show Route / User Route
    - Create Route / CreateUser Route
    - Delete Route / DeleteUser Route
    - To Check who is logged Get Route
*/

router.put('/seed', async (req,res)=>{
    console.log(seedData)

    try {
        console.log('Dropping User and Post collections')
        await Promise.all([
            User.collection.drop(),
        ])
        console.log('Collections dropped')
    } catch {
        console.log('Collections not found')
    }
    
    seedData.forEach(async (user)=>{
        await User.register(    
            new User(user),
            '1234'
        )
    })
    res.json('data seeded')
})

//get Profiles - takes the logged in user profile and sends back profiles to show based on users preferences
    //Required logic/checks:
        //profile must have required fields filled out
        //profile must not appear in users seen array
        //profile must fit user preferences, and vice-versa
router.get('/v1/profiles', async (req,res) => {
    
    const responseLength = 20

    const checkAgeCompatibility = (user1,user2) => {
        const user1DOB = new Date(user1.dateOfBirth)
        const user1MaxDOB = new Date(user1DOB)
        const user1MinDOB = new Date(user1DOB)
        user1MaxDOB.setFullYear(user1MaxDOB.getFullYear()+user1.ageRange)
        user1MinDOB.setFullYear(user1MinDOB.getFullYear()-user1.ageRange)
        
        const user2DOB = new Date(user2.dateOfBirth)
        const user2MaxDOB = new Date(user2DOB)
        const user2MinDOB = new Date(user2DOB)
        user2MaxDOB.setFullYear(user2MaxDOB.getFullYear()+user2.ageRange)
        user2MinDOB.setFullYear(user2MinDOB.getFullYear()-user2.ageRange)

        const check1 = (user2DOB >= user1MinDOB && user2DOB <=user1MaxDOB) 
        const check2 = (user1DOB >= user2MinDOB && user1DOB <=user2MaxDOB) 
        return (check1 && check2)
    }

    const checkGenderCompatibility = (user1,user2) => {
        const check1 = user1.genderPref === user2.gender
        const check2 = user2.genderPref === user1.gender
        return (check1 && check2)
    }

    const checkSeen = (user1,user2) => {
        return !user1.seen.every((e) => {
            return (e.user._id.toString()!==user2.id)
        })
    }

    const queue=[]
    const allProfiles = await User.find({_id: {$ne:req.user.id}}) //get all profiles except the loged in users
    const filteredProfiles = allProfiles.filter((e)=>{
        return (e.displayName) //filter out any incomplete profiles. displayName will be undefined for incomplete profiles
    })

    filteredProfiles.every((profile)=>{
        const ageCompatible = checkAgeCompatibility(req.user,profile)
        const genderCompatible = checkGenderCompatibility(req.user,profile)
        const seen = checkSeen(req.user,profile)

        if (ageCompatible && genderCompatible && !seen) {
            queue.push(profile)
        }

        return queue.length<responseLength
    })

    res.json(queue)
})


//get users matches - return matches of user
router.get('/v1/matches', async (req,res) => {
     const matchIDs = req.user.matches.map((e)=>{
        return matchIDs.push(e.match.toString())
    })
    const matches = await User.find({_id:matchIDs})
    res.json(matches)
})


//show route (Get match) - returns selected matches user profile
router.get('/v1/profiles/:matchedUserID', (req,res) => {
    //expects a user id of the matched user to dispaly
    //returns profile of user
})



//edit route - edit own user profile 
router.put('/v1/profiles/:userID', upload.fields([{name:'images'},{name:'coverImage'}]), async (req,res) => {
    
    let user = await User.findById(req.params.userID)

    const existingCoverImage = user.coverImage
    if (req.files?.coverImage) {
      req.body.coverImage = req.files.coverImage[0].path
    } else {
      req.body.coverImage = existingCoverImage
    }

    const existingImages = user.images
    if (req.files?.images) {

        const newImages = req.files.images.map((image)=>{
            console.log(image,'iterated image')
            return image.path
        })
        req.body.images = [...existingImages,...newImages]
    } else {
        req.body.images = existingImages
    }


    user = await User.findByIdAndUpdate(req.params.userID,req.body,{new:true})

    res.json(user)

})

router.put('/v1/profiles/:userID/:imageID', async (req,res) => {
    //expects the cloudinary image name, eg "wt0sd4gcjcjsr4xyxydg.jpg"
    let user = await User.findById(req.params.userID)

    const newImages = [...user.images].filter((image)=>{
        const id = image.slice(image.lastIndexOf('/')+1)
        return id !== req.params.imageID
    })
    user.images = newImages

    user.save()
    res.json(user.images)
})


// delete route - delete own user profile
    // ---> log the user out in front end
    // --->nav user back to register page.
    // ---> then delete the user profile

router.delete('/v1/profiles/:userID', async (req,res) => {
    let user = await User.findById(req.params.id)
    if (req.user?.id !== req.params.id) {
        return res.status(401).json({msg: 'Not Authorised'})
    }
    user = await user.remove()
    res.json(user)
  })



//Swipe API
    //updates the seen array, with the result of the swipe (like = true/false)
    //check for match - named function
    //create match, update user match arrays, create a chatroom - named function
router.put('/v1/swipe/:swipedUserID', (req,res) => {
    //expects req.body to contain an object ({liked:Booolean}) depending on which way user swiped
    //expects id of swiped user 

    //update databases

    //sends object of whether it is match or not {match:Boolean}
    res.json({match:false})
})



//remove match API
    //update both users match array
router.put('/v1/profiles/remove/:matchedUserID'), (req,res) => {
    //ex
}




//Messaging API??? need research



module.exports = router