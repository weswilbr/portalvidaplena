#!/bin/bash
# Script de atualização do bot na VPS
cd /root/portalvidaplena || cd /root/vidaplena || cd ~/app || cd ~/portalvidaplena

# Atualiza o código
git pull origin main

# Reinicia o bot via PM2
pm2 restart bot --update-env

# Mostra os logs em tempo real
pm2 logs bot --lines 30
