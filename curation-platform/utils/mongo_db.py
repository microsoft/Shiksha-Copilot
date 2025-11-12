from dotenv import load_dotenv
import os
import pymongo

load_dotenv()

class MongoDB:
    def __init__(self, collection_name):
        client = pymongo.MongoClient(os.environ["COSMOS_CONNECTION_STRING"])
        db = client[os.environ["MONGO_DB_NAME"]]
        self.collection = db[collection_name]
    
    def delete_by_id(self, id: str):
        return self.collection.delete_one({"_id": id})
    
    def find_by_id(self, id_string: str):
        return self.collection.find_one({'_id': id_string})

    def find_all(self):
        return list(self.collection.find({}))
    
    def insert_doc(self, doc: dict):
        return self.collection.update_one({"_id": doc["_id"]}, 
                                          {'$set': doc}, 
                                          upsert=True)
    
    def update_doc(self, updates: dict, id: str):
        return self.collection.update_one({"_id": id}, {'$set': updates})
        
    def find_all_by_ids(self, ids: list[str]):
        documents = list(self.collection.find({'_id': {'$in': ids}}))
        documents_dict = {doc['_id']: doc for doc in documents}
        ordered_documents = [documents_dict[_id] for _id in ids if _id in documents_dict]
        return ordered_documents
    
    
        