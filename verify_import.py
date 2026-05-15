import requests

res = requests.post('http://localhost:4000/api/auth/login', json={
    'username': 'watchara.kid',
    'password': 'Jack@3751'
})
token = res.json()['token']
headers = {'Authorization': f'Bearer {token}'}

res = requests.get('http://localhost:4000/api/assets?limit=5', headers=headers)
for a in res.json()['data']:
    print(f"ID: {a['id']}, Code: {a.get('assetCode','N/A')}, Serial: {a.get('serialNo','N/A')}, Gen: {a.get('cpuGeneration','N/A')}, Type: {a.get('type','N/A')}, Brand: {a.get('brand','N/A')}")
