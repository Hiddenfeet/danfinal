import {
  Box,
  Flex,
  Text,
  Button,
  Divider,
  Image,
  SimpleGrid,
  ButtonGroup,
  Stack,
  useToast,
  Heading,
  Container,
} from "@chakra-ui/react";

import { FaPlus, FaMinus } from "react-icons/fa";
import {
  useActiveClaimConditionForWallet,
  useAddress,
  useClaimConditions,
  useClaimedNFTSupply,
  useClaimerProofs,
  useClaimIneligibilityReasons,
  useContract,
  useContractMetadata,
  useContractRead,
  useContractWrite,
  useUnclaimedNFTSupply,
  Web3Button,
} from "@thirdweb-dev/react";
import { useEffect, useMemo, useState } from "react";
import { BigNumber, ethers, utils } from "ethers";
import { parseIneligibility } from "./utils/parseIneligibility";

export default function IndepMint() {
  const address = useAddress();

  const STEAK_TOKEN_ADDRESS = "0x4137A9F6eb939a8d7d620b239B562596E48d6F41";



  const { contract: stakeTokenContract } = useContract(
    STEAK_TOKEN_ADDRESS,
    "token"
  );
  const toast = useToast();  
  const [ADLoading, setADLoading] = useState(false);
  
  const handleSuccess = () => {
    toast({
      title: "Your Liberator NFT Mint was Successful, Enjoy the liberatoion from FEEdom!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleError = () => {
    toast({
      title:
        "Something went wrong whilst trying to mint your Liberator NFT, if you did not reject the transaction, please try again. If the error persists contact us on via our socials.",
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  };


  const contractAddress = "0xC0D28282A4780e099884f344A9746A2D75A1BAF7";
  const contractQuery = useContract(contractAddress);
  const contractMetadata = useContractMetadata(contractQuery.contract);

  const [quantity, setQuantity] = useState(1);
  const claimConditions = useClaimConditions(contractQuery.contract);
  const activeClaimCondition = useActiveClaimConditionForWallet(
    contractQuery.contract,
    address
  );
  const claimerProofs = useClaimerProofs(contractQuery.contract, address || "");
  const claimIneligibilityReasons = useClaimIneligibilityReasons(
    contractQuery.contract,
    {
      quantity,
      walletAddress: address || "",
    }
  );
  const unclaimedSupply = useUnclaimedNFTSupply(contractQuery.contract);
  const claimedSupply = useClaimedNFTSupply(contractQuery.contract);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    return BigNumber.from(claimedSupply.data || 0)
      .add(BigNumber.from(unclaimedSupply.data || 0))
      .toString();
  }, [claimedSupply.data, unclaimedSupply.data]);

  const priceToMint = useMemo(() => {
    const bnPrice = BigNumber.from(
      activeClaimCondition.data?.currencyMetadata.value || 0
    );
    return `${utils.formatUnits(
      bnPrice.mul(quantity).toString(),
      activeClaimCondition.data?.currencyMetadata.decimals || 18
    )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    const maxAvailable = BigNumber.from(unclaimedSupply.data || 0);

    let max;
    if (maxAvailable.lt(bnMaxClaimable)) {
      max = maxAvailable;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000)) {
      return 1_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    unclaimedSupply.data,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0
          )) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return (
      activeClaimCondition.isLoading ||
      unclaimedSupply.isLoading ||
      claimedSupply.isLoading ||
      !contractQuery.contract
    );
  }, [
    activeClaimCondition.isLoading,
    contractQuery.contract,
    claimedSupply.isLoading,
    unclaimedSupply.isLoading,
  ]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );

  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      if (pricePerToken.eq(0)) {
        return "Mint (Free)";
      }
      return `Mint ${quantity} Liberators (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Minting not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  const dropNotReady = useMemo(
    () =>
      claimConditions.data?.length === 0 ||
      claimConditions.data?.every((cc) => cc.maxClaimableSupply === "0"),
    [claimConditions.data]
  );

  const dropStartingSoon = useMemo(
    () =>
      (claimConditions.data &&
        claimConditions.data.length > 0 &&
        activeClaimCondition.isError) ||
      (activeClaimCondition.data &&
        activeClaimCondition.data.startTime > new Date()),
    [
      activeClaimCondition.data,
      activeClaimCondition.isError,
      claimConditions.data,
    ]
  );

  return (




          <Box
            width={{ base: 360, md: 600 }}
            p={6}
            borderRadius="lg"
            boxShadow="xl"
            position="relative"
            overflow="hidden"
            bgImage={`linear-gradient(rgba(255, 255, 255, 0.8), rgba(0, 0, 0, 0.2)), url('/Tokens/USA.png')`}
            alignItems="center"
            justifyContent="center"
            margin={"auto"}
          >
            <Text
              fontSize="5xl"
              mb={4}
              textAlign={{ base: "center", md: "left" }}
              textColor={"Black"}
              fontWeight={"bold"}
              fontFamily={"cursive"}
            >
              The Cronos Steakhouse: {contractMetadata.data?.name}
            </Text>
            <Text
              fontSize="xl"
              mb={4}
              textAlign={{ base: "center", md: "left" }}
              fontWeight={"bold"}
            >
              Do you have what it takes to become a Liberator?
            </Text>
            <Text
              fontSize="2xl"
              mb={4}
              textAlign={{ base: "center", md: "left" }}
              fontWeight={"bold"}
              textColor={"blackAlpha.700"}
            >
              Price: {priceToMint}
            </Text>
            <Text
              mb={4}
              textAlign={{ base: "center", md: "left" }}
              fontWeight={"bold"}
            >
              {contractMetadata.data?.description}
            </Text>
            <Flex
              direction={{ base: "column", md: "column" }}
              align={{ base: "center", md: "flex-start" }}
              justify={{ base: "center", md: "flex-start" }}
              textColor={"Black"}
            >
              <Box textColor={"Black"}>
                <Stack
                  direction={{ base: "column", md: "row" }}
                  spacing={4}
                  mt={4}
                >
                  <Button
                    as={Web3Button}
                    color="Black"
                    size="lg"
                    contractAddress={contractQuery.contract?.getAddress() || ""}
                    action={(cntr: {
                      erc721: { claim: (arg0: number) => any };
                    }) => cntr.erc721.claim(quantity)}
                    isDisabled={!canClaim || buttonLoading}
                    onError={(err) => {
                      console.error(err);
                      console.log({ err });
                    }}
                    onSuccess={() => {
                      console.table();
                    }}
                  >
                    {buttonLoading ? <Text>Loading</Text> : buttonText}
                  </Button>

                  <Button color="Black" size="lg">
                    {numberClaimed} / {numberTotal}
                  </Button>
                </Stack>
              </Box>
              <Box mt={{ base: 2, md: 4 }}>
                <ButtonGroup>
                  <Button
                    color="Black"
                    size="lg"
                    onClick={() => {
                      const value = quantity - 1;
                      if (value > maxClaimable) {
                        setQuantity(maxClaimable);
                      } else if (value < 1) {
                        setQuantity(1);
                      } else {
                        setQuantity(value);
                      }
                    }}
                    disabled={isSoldOut || quantity - 1 < 1}
                  >
                    <FaMinus />
                  </Button>

                  <Button color="Black" size="lg">
                    {quantity}
                  </Button>

                  <Button
                    color="Black"
                    size="lg"
                    onClick={() => {
                      const value = quantity + 1;
                      if (value > maxClaimable) {
                        setQuantity(maxClaimable);
                      } else if (value < 1) {
                        setQuantity(1);
                      } else {
                        setQuantity(value);
                      }
                    }}
                    disabled={isSoldOut || quantity + 1 > maxClaimable}
                  >
                    <FaPlus />
                  </Button>
                </ButtonGroup>
              </Box>
              <SimpleGrid h={8} />
            </Flex>
          </Box>

  );
}