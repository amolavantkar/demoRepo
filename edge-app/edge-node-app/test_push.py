import redis
import json

r = redis.Redis(
    host='10.0.0.3',
    port=6379)

# create a pubsub object
p = r.pubsub()

# # subscribe to a channel
p.subscribe('edgeApp')

value = r.get('operations')
y = json.loads(value)
# print(y["data"][0])

json_str = json.dumps(y["data"][0])

# json_str = '{ "id": 1, "issue_type": "Curbside", "description": "Parking lot not clean", "time": "Apr 20, 03:00 PM", "ack": "Yes", "img": "https://media-cdn.tripadvisor.com/media/photo-p/0c/c7/c8/f4/view-of-the-restaurant.jpg" }'

# decode the JSON string
# data = json.loads(json_str)

# print(json_str)
r.publish("edgeApp",json_str)