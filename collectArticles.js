const dotenv = require('dotenv');
dotenv.config();

// insertion -----------------------------------------------------

// takes an array of articles and inserts them into the database
const { MongoClient } = require('mongodb'); // mongodb v2 only uses commonjs modules - do not import with ES6 syntax
const mongoClient = new MongoClient('mongodb://127.0.0.1:27017', { useUnifiedTopology: true } ); //options object to avoid deprecation warning on aws server -- not needed on local server bc mongodb is up to date

const insertData = async (articles, category) => {
    console.log('Inserting data');
    try {
        await mongoClient.connect();
        console.log('Connected to database');
        const database = mongoClient.db('admin');
        const collection = database.collection('articles');

        let index= 0;
        for (const article of articles) {
            // skip if any of the fields are null
            if ( article.title === null || article.urlToImage === null || article.content === null) {
                console.warn(`${index}: Skipping article with null field`);
                index++;
                continue;
            }
            // avoid duplicates
            const found = await collection.findOne({ title: article.title });
            if (found) {
                console.warn(`${index}: Article already exists`);
                index++;
                continue;
             }

            // insert data
            const response = await collection.insertMany([
                {
                    category: category,
                    sourceId: article.source.id,
                    sourceName: article.source.name,
                    author: article.author,
                    title: article.title,
                    description: article.description,
                    url: article.url,
                    urlToImage: article.urlToImage,
                    publishedAt: article.publishedAt,
                    content: article.content, 
                },
            ]);
            console.log(`${index}: ${article.title}`);
            index++;
            wait(250);
        }
    } catch (error) {
        console.error(error);
    } finally {
        if (mongoClient.on) {
            await mongoClient.close();
        }
    }
}

// collection -----------------------------------------------------

// collects articles from the newsapi and calls insertData to insert them into the database
const NewsAPI = require('newsapi');
const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

const collectArticles = async (category) => {
    try{
        const response = await newsapi.v2.topHeadlines({
            category: category,
            language: 'en',
            sortBy: 'relevancy',
            pageSize: 100,
        });

        console.log(`Collected ${response.articles.length} articles`);
        insertData(response.articles, category);

    }
    catch(error){
        console.error(error);
    }
}

// helpers -----------------------------------------------------
function wait(ms) {
    const start = Date.now();
    let now = start;
    while (now - start < ms) {
        now = Date.now();
    }
}


// main --------------------------------------------------------

// collect articles for each category and stores them in the database
const categories = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
for (const category of categories) {
    collectArticles(category);
}

