#!/bin/bash

#Atualiza links entre projetos para deve

(cd .. && npm link)
(cd demo01 && npm link sindri-framework)
(cd demo01b && npm link sindri-framework)



