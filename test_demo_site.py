import requests
from bs4 import BeautifulSoup

r = requests.get('https://demo-project-theta-brown.vercel.app/')
soup = BeautifulSoup(r.text, 'html.parser')
for s in soup.find_all('script'):
    print('SCRIPT:', s.get('src'), s.get('data-token'))
