#!/bin/bash

#Atualiza links entre projetos para deve

(cd .. && npm link)
(cd demo01 && npm link @agtm/sindri-framework)
(cd demo01b && npm link @agtm/sindri-framework)
(cd cluster && npm link @agtm/sindri-framework)



