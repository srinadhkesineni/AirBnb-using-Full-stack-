const express=require("express")
const app=express()
const mongoose=require("mongoose")
const MONGO_URL="mongodb://127.0.0.1:27017/wanderlust"
const Listing=require("./models/listing.js")
const path=require("path")
const methodOverride=require("method-override")
const ejsMate=require("ejs-mate")
const wrapAsync=require("./utils/wrapAsync.js")
const ExpressError=require("./utils/ExpressError.js")
// const { url } = require("inspector")
const { listingSchema , reviewSchema }=require("./schema.js")

const listings=require("./models/listing.js")
const Review=require("./models/review.js")


app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs")
app.use(express.urlencoded({extended:true}))
app.use(methodOverride("_method"))
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")))

main()
    .then(()=>{
        console.log("connected to DB")
    })
    .catch((err)=>{
        console.log(err)
    })

async function main(){
    await mongoose.connect(MONGO_URL)
}
app.get("/",(req,res)=>{
    res.send("Hi! im root..")
})

const validateListing=(req,res,next)=>{
    let { error }=listingSchema.validate(req.body)
    if (error){
        let errMsg=error.details.map((el)=>el.message).join(",")
        throw new ExpressError(400,errMsg)
    }else {
        next()
    }
}

const validateReview=(req,res,next)=>{
    let { error }=reviewSchema.validate(req.body)
    if (error){
        let errMsg=error.details.map((el)=>el.message).join(",")
        throw new ExpressError(400,errMsg)
    }else {
        next()
    }
}

//index route
app.get("/listings", wrapAsync(async (req,res)=>{
    const allListings= await Listing.find({})
    res.render("listings/index.ejs",{allListings})
}) )

//New Route
app.get("/listings/new",wrapAsync(async(req,res)=>{
    res.render("listings/new.ejs")
}))

//show route
app.get("/listings/:id",wrapAsync(async (req,res)=>{
    let {id}=req.params
    const listing=await Listing.findById(id).populate("reviews")
    res.render("listings/show.ejs",{listing})
}))

//Create Route
app.post(
    "/listings",
    validateListing,
    wrapAsync(async(req,res,next)=>{
        const newListing=new Listing(req.body.listing) 
        await newListing.save()
        res.redirect("/listings")
    })
)

//Edit Route
app.get("/listings/:id/edit",wrapAsync(async (req,res)=>{
    let {id}=req.params
    const listing=await Listing.findById(id)
    res.render("listings/edit.ejs",{listing})
}))

//Update Route
app.put(
    "/listings/:id",
    validateListing,
    wrapAsync(async (req,res)=>{
    let {id}=req.params
    await Listing.findByIdAndUpdate(id,{...req.body.listing})
    res.redirect(`/listings/${id}`)  

}))

//Delete Route
app.delete("/listings/:id",wrapAsync(async (req,res)=>{
    let {id}=req.params
    let deletedLising=await Listing.findByIdAndDelete(id)
    console.log(deletedLising)
    res.redirect("/listings")
}))


//Reviews
//Post route
app.post("/listings/:id/reviews",
    validateReview,
       wrapAsync( async(req,res)=>{
        let listing=await Listing.findById(req.params.id)
        let newReview=new Review(req.body.review)
        listing.reviews.push(newReview)
        await newReview.save()
        await listing.save()
        res.redirect(`/listings/${listing._id}`)
        console.log("saved successfull")
}))

//Delete Review Route
app.delete("/listings/:id/reviews/:reviewId",wrapAsync(async(req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id, {$pull:{reviews:reviewId}})
    await Review.findByIdAndDelete(reviewId)

    res.redirect(`/listings/${id}`)
}))


// app.get("/testListing",async (req,res)=>{
//     let sampleListing=new Listing({
//         title:"My new Villa",
//         description:"BY the beach",
//         price:1200,
//         location:"calangute, Goa",
//         country:"India",
//     })

//     await sampleListing.save()
//     console.log("sample was saved")
//     res.send("successful testing")
// })

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found"))
})

//if any error occured this middleware will be called..
app.use((err,req,res,next)=>{
    let {status=500,message="Some random error occured"}=err
    res.status(status).render("error.ejs",{message})
})

app.listen(8080,()=>{
    console.log("app is working")
})

